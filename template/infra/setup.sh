#!/usr/bin/env bash
set -euo pipefail

STORAGE_ACCOUNT="fotusappstorage"

echo "=============================="
echo "  csc-web-kit — Azure Setup   "
echo "=============================="
echo ""

read -rp "Nome da aplicação (ex: minha-app): " APP_NAME
read -rp "Resource Group: " RESOURCE_GROUP
read -rp "Região (ex: brazilsouth): " LOCATION

echo ""
echo ">>> Criando Azure Static Web App..."
SWA_TOKEN=$(az staticwebapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Free \
  --query "repositoryToken" \
  --output tsv)

echo ">>> Azure Static Web App criado."

echo ""
echo ">>> Verificando Storage Account '$STORAGE_ACCOUNT'..."
if ! az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  echo "    Storage Account não encontrada. Criando..."
  az storage account create \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2
fi

STORAGE_KEY=$(az storage account keys list \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[0].value" \
  --output tsv)

echo ">>> Criando File Share '$APP_NAME'..."
az storage share create \
  --name "$APP_NAME" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --quota 5

echo ""
echo ">>> Criando Azure Container App..."
az containerapp create \
  --name "$APP_NAME-pb" \
  --resource-group "$RESOURCE_GROUP" \
  --image "ghcr.io/muchobien/pocketbase:latest" \
  --environment "$APP_NAME-env" \
  --ingress external \
  --target-port 8090 \
  --min-replicas 0 \
  --max-replicas 1

echo ""
echo ">>> Montando File Share no Container App..."
az containerapp volume attach \
  --name "$APP_NAME-pb" \
  --resource-group "$RESOURCE_GROUP" \
  --storage-name "$STORAGE_ACCOUNT" \
  --storage-account-name "$STORAGE_ACCOUNT" \
  --storage-account-key "$STORAGE_KEY" \
  --azure-file-volume-share-name "$APP_NAME" \
  --volume-name "pb-data" \
  --mount-path "/pb/pb_data" 2>/dev/null || \
  echo "    [aviso] Monte manual necessário via portal ou CLI atualizada."

ACR_INFO=$(az acr list --resource-group "$RESOURCE_GROUP" --query "[0].{server:loginServer,name:name}" -o json 2>/dev/null || echo "{}")
ACR_SERVER=$(echo "$ACR_INFO" | grep -o '"server":"[^"]*"' | cut -d'"' -f4 || echo "<SEU_ACR>.azurecr.io")

echo ""
echo "======================================"
echo "  Secrets para o GitHub Actions       "
echo "======================================"
echo ""
echo "  AZURE_STATIC_WEB_APPS_API_TOKEN = $SWA_TOKEN"
echo "  ACR_LOGIN_SERVER                = $ACR_SERVER"
echo "  ACR_USERNAME                    = (az acr credential show --name <acr-name> --query username)"
echo "  ACR_PASSWORD                    = (az acr credential show --name <acr-name> --query passwords[0].value)"
echo "  AZURE_RESOURCE_GROUP            = $RESOURCE_GROUP"
echo "  AZURE_CONTAINER_APP_NAME        = $APP_NAME-pb"
echo "  AZURE_CREDENTIALS               = (az ad sp create-for-rbac --sdk-auth)"
echo ""
echo "======================================"
echo "  Variáveis para o .env              "
echo "======================================"
echo ""
echo "  VITE_POCKETBASE_URL             = <URL pública do Container App>/api"
echo "  VITE_OAUTH_CLIENT_ID            = <client_id do app no Entra ID>"
echo "  VITE_OAUTH_REDIRECT_URI         = <URL do Static Web App>/auth/callback"
echo ""
echo "Setup concluído!"

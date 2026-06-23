import type { RecordModel } from 'pocketbase'

export interface Group extends RecordModel {
  name: string
  description: string
}

export interface Screen extends RecordModel {
  route: string
  name: string
  groups: string[]
  collection?: string
}

export interface UserRow extends RecordModel {
  name: string
  email: string
  group: string
}

import { join as path_join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'



export async function get_user_dir() {
  const user_dir = path_join(homedir(), 'ProjectNote')
  await mkdir(user_dir, { recursive: true })
  return user_dir  
}
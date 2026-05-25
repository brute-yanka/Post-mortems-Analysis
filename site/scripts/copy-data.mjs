import { mkdirSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', '..', 'cloud_incidents.csv')
const dest = join(here, '..', 'public', 'cloud_incidents.csv')

mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log(`Copied ${src} -> ${dest}`)

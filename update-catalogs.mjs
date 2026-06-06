import fs from 'node:fs'
import path from 'node:path'
import packageJson from 'package-json'
import { parseDocument } from 'yaml'

const WORKSPACE_FILE = path.join(process.cwd(), 'pnpm-workspace.yaml')

async function updateCatalogs() {
  if (!fs.existsSync(WORKSPACE_FILE)) {
    console.error('❌ pnpm-workspace.yaml not found.')
    process.exit(1)
  }

  const fileContent = fs.readFileSync(WORKSPACE_FILE, 'utf8')
  const doc = parseDocument(fileContent)

  // Get the catalogs object from the YAML
  const catalogs = doc.get('catalogs')

  if (!catalogs) {
    console.log('ℹ️ No catalogs found in pnpm-workspace.yaml')
    return
  }

  // We convert to JS object to easily iterate, but we will modify the 'doc' directly
  // to preserve formatting and comments.
  const catalogsJS = catalogs.toJSON()

  console.log('🔄 Fetching latest versions for catalog dependencies...')

  // Handle both default catalog (object) and named catalogs (nested objects)
  async function processCatalog(catalogJson, yamlPathArray) {
    for (const [pkg, currentVer] of Object.entries(catalogJson)) {
      // Skip local workspace references if any exist in your catalog
      if (currentVer.startsWith('workspace:')) {
        continue
      }

      try {
        const metadata = await packageJson(pkg, { version: 'latest' })
        const latestVer = `^${metadata.version}` // Or use exact version if you prefer

        if (currentVer !== latestVer) {
          console.log(`  🔹 ${pkg}: ${currentVer} ➡️ ${latestVer}`)
          // Set the new value in the YAML document structure
          doc.setIn([...yamlPathArray, pkg], latestVer)
        }
        else {
          console.log(`  ✅ ${pkg}: already up-to-date (${currentVer})`)
        }
      }
      catch (err) {
        console.error(`  ❌ Failed to fetch ${pkg}:`, err.message)
      }
    }
  }

  // Check if it's a named catalogs structure or a single default catalog
  // pnpm allows both: `catalogs: { ... }` or `catalogs: { default: {...}, named: {...} }`
  const hasNamedCatalogs = Object.values(catalogsJS).some(val => typeof val === 'object' && val !== null)

  if (hasNamedCatalogs) {
    for (const catalogName of Object.keys(catalogsJS)) {
      console.log(`\n📦 Processing Catalog: [${catalogName}]`)
      await processCatalog(catalogsJS[catalogName], ['catalogs', catalogName])
    }
  }
  else {
    console.log(`\n📦 Processing Default Catalog`)
    await processCatalog(catalogsJS, ['catalogs'])
  }

  // Save the modified YAML back to the file
  fs.writeFileSync(WORKSPACE_FILE, doc.toString(), 'utf8')
  console.log('\n🚀 pnpm-workspace.yaml updated successfully! Running pnpm install...')
}

updateCatalogs()

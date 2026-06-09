import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTests } from '@vscode/test-electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionDevelopmentPath = path.resolve(__dirname, '..')
const extensionTestsPath = path.resolve(extensionDevelopmentPath, 'dist', 'integration', 'suite.js')
const workspacePath = mkdtempSync(path.join(tmpdir(), 'human-markdown-integration-'))

try {
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    extensionTestsEnv: {
      HUMAN_MARKDOWN_TEST_HOOKS: '1',
    },
    launchArgs: [workspacePath],
  })
} finally {
  rmSync(workspacePath, { recursive: true, force: true })
}

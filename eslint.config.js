// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './.nuxt/eslint.config.mjs'

export default antfu(
  {
    unocss: true,
    formatters: true,
    pnpm: true,
    rules: {
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'pnpm/json-prefer-workspace-settings': 'off', // Disable this rule due to trust downgrade security concerns
    },
  },
)
  .append(nuxt())
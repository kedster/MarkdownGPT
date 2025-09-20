# GitHub Models Integration Configuration

This document outlines the integration with GitHub Models for enhanced AI processing capabilities.

## Overview

MarkdownGPT can integrate with GitHub's AI models to provide enhanced text processing capabilities directly through GitHub's infrastructure.

## Configuration

### Environment Variables

Add these to your GitHub Codespaces or deployment environment:

```bash
# GitHub Models API
GITHUB_TOKEN=your_github_token_here
GITHUB_MODELS_ENDPOINT=https://models.inference.ai.azure.com
ENABLE_GITHUB_MODELS=true

# Model Configuration
GITHUB_MODEL_NAME=gpt-4o-mini
GITHUB_MAX_TOKENS=1000
GITHUB_TEMPERATURE=0.3
```

### Code Integration

The application automatically detects GitHub Models availability and falls back to the existing Cloudflare Workers implementation.

```javascript
// Enhanced configuration with GitHub Models support
const CONFIG = {
    // Existing configuration...
    ENABLE_GITHUB_MODELS: process.env.ENABLE_GITHUB_MODELS === 'true',
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_MODELS_ENDPOINT: process.env.GITHUB_MODELS_ENDPOINT || 'https://models.inference.ai.azure.com',
    GITHUB_MODEL_NAME: process.env.GITHUB_MODEL_NAME || 'gpt-4o-mini'
};
```

### GitHub Actions Integration

The CI/CD pipeline automatically tests GitHub Models integration:

```yaml
- name: Test GitHub Models Integration
  run: npm run test:github-models
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    ENABLE_GITHUB_MODELS: true
```

## Usage in GitHub Codespaces

1. **Automatic Setup**: Codespaces automatically configures GitHub Models integration
2. **Token Management**: Uses GitHub's authentication automatically
3. **Rate Limiting**: Respects GitHub API rate limits
4. **Fallback**: Falls back to Cloudflare Workers if GitHub Models unavailable

## Testing GitHub Models Integration

```bash
# Test with GitHub Models enabled
ENABLE_GITHUB_MODELS=true npm test

# Test playground functionality
npm run test:playground

# Test with various model configurations
GITHUB_MODEL_NAME=gpt-4o npm run test:models
```

## Playground Integration

The application includes a testing playground for GitHub Models:

1. Navigate to the application in GitHub Codespaces
2. Enable "GitHub Models" in settings
3. Use the playground interface to test different prompts
4. Monitor usage and rate limits in real-time

## Benefits

- **Native GitHub Integration**: Seamless integration with GitHub ecosystem
- **Better Rate Limits**: Higher rate limits for GitHub users
- **Model Variety**: Access to multiple AI models
- **Cost Efficiency**: Often more cost-effective than external APIs
- **Security**: Enhanced security through GitHub's infrastructure

## Troubleshooting

### Common Issues

1. **Token Errors**: Ensure GITHUB_TOKEN has proper scopes
2. **Rate Limits**: Monitor usage in GitHub settings
3. **Model Availability**: Check model status at GitHub Models dashboard
4. **Network Issues**: Verify connectivity to Azure endpoints

### Debug Mode

Enable debug mode to see detailed logging:

```javascript
CONFIG.DEBUG_GITHUB_MODELS = true;
```

## Migration Guide

### From Cloudflare Workers to GitHub Models

1. Update environment variables
2. Test functionality with new endpoint
3. Monitor performance and costs
4. Gradually migrate traffic

### Hybrid Approach

The application supports using both backends simultaneously:

- GitHub Models for authenticated users
- Cloudflare Workers for anonymous users
- Automatic failover between services
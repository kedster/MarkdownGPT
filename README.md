# MarkdownGPT

🚀 **Transform your raw text with AI-powered formatting and processing**

MarkdownGPT is a powerful web application that uses AI to automatically format and structure your text into professional documents. Whether you need a development article, tutorial, README, or ChatGPT prompt, MarkdownGPT makes it easy to create well-structured content with just a few clicks.

![MarkdownGPT Interface](https://img.shields.io/badge/Interface-Modern%20%26%20Clean-blue)
![AI Powered](https://img.shields.io/badge/AI-Powered-green)
![Open Source](https://img.shields.io/badge/Open%20Source-MIT-yellow)

## ✨ Features

- **🤖 AI-Powered Processing**: Transform raw text into structured content using advanced AI
- **📝 Multiple Formats**: Support for Dev.to articles, Medium articles, tutorials, READMEs, and more
- **⚡ Real-time Preview**: See your formatted content instantly
- **🎨 Syntax Highlighting**: Code blocks with beautiful syntax highlighting
- **📊 Smart Templates**: Pre-built templates for common document types
- **💾 Export Options**: Export to Markdown, HTML, or copy to clipboard
- **🔒 Secure**: Optional JWT authentication with session management
- **📱 Responsive**: Works perfectly on desktop and mobile devices

## 🚀 Quick Start

### Option 1: GitHub Codespaces (Recommended)
1. Click the "Code" button on this repository
2. Select "Codespaces" → "Create codespace on main"
3. Wait for the environment to load (includes all dependencies)
4. Open the integrated terminal and run: `npm start`
5. Access the application at `http://localhost:8000`

### Option 2: Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/kedster/MarkdownGPT.git
   cd MarkdownGPT
   ```

2. Start a local server:
   ```bash
   # Using Python
   python3 -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server -p 8000
   
   # Using PHP
   php -S localhost:8000
   ```

3. Open your browser and navigate to `http://localhost:8000`

## 📖 Usage

### Basic Usage
1. **Enter Text**: Type or paste your raw text in the left panel (max 1000 characters)
2. **Choose Format**: Select from AI processing options like "Dev.to Article" or "Tutorial"
3. **Process**: Click the format button to transform your text
4. **Review**: See the AI-processed output in the right panel
5. **Export**: Use the export options to save or copy your formatted content

### Advanced Features

#### Manual Formatting
Use the toolbar buttons for quick formatting:
- **Bold** (`**text**`)
- **Italic** (`*text*`)
- **Code** (`code`)
- **Code Block** (```code```)
- **Quote** (`> text`)
- **Lists** (`- item`)
- **Headers** (`## H2`, `### H3`)

#### AI Processing Options
- **📚 Dev.to Article**: Transforms text into well-structured development articles
- **📊 Medium.com Article**: Formats content for Medium-style articles
- **📝 Tutorial**: Creates step-by-step tutorials with numbered sections
- **📄 README**: Generates professional README documents
- **🤖 ChatGPT Prompt**: Formats text as structured ChatGPT prompts

## 🛠️ Configuration

### Environment Variables
Create a `.env` file for custom configuration:

```env
# AI Worker Configuration
AI_WORKER_URL=https://your-ai-worker.workers.dev
JWT_WORKER_URL=https://your-jwt-worker.workers.dev

# Feature Flags
ENABLE_JWT=false
ENABLE_GITHUB_MODELS=true

# Limits
MAX_TEXT_LENGTH=1000
```

### GitHub Models Integration
To enable GitHub Models integration for AI processing:

1. Set up a GitHub App or Personal Access Token
2. Configure the AI worker endpoints
3. Enable the feature in configuration:
   ```javascript
   const CONFIG = {
       ENABLE_GITHUB_MODELS: true,
       GITHUB_TOKEN: process.env.GITHUB_TOKEN
   };
   ```

## 🧪 Testing

### Running Tests
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### Manual Testing
1. Test text processing with various input types
2. Verify export functionality
3. Test error handling with invalid inputs
4. Check responsive design on different screen sizes

## 🏗️ Development

### Project Structure
```
MarkdownGPT/
├── index.html          # Main application interface
├── script.js           # Core JavaScript functionality
├── styles.css          # Application styles
├── tests/              # Test files
├── .devcontainer/      # GitHub Codespaces configuration
├── .github/            # GitHub Actions workflows
└── docs/              # Documentation
```

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style
- Use ES6+ features where appropriate
- Follow consistent naming conventions
- Add comments for complex logic
- Ensure mobile responsiveness
- Write tests for new features

## 🔧 API Reference

### Core Functions

#### `processWithAI(format, customPrompt)`
Processes text using AI with the specified format.

**Parameters:**
- `format` (string): The target format ('dev-article', 'tutorial', etc.)
- `customPrompt` (string, optional): Custom processing prompt

**Returns:**
- Promise that resolves when processing is complete

**Example:**
```javascript
await processWithAI('dev-article', 'Transform this into a technical blog post');
```

#### `insertFormat(before, after, placeholder)`
Inserts formatting around selected text or at cursor position.

**Parameters:**
- `before` (string): Text to insert before selection
- `after` (string): Text to insert after selection  
- `placeholder` (string): Placeholder text if nothing is selected

### Configuration API

#### `CONFIG`
Global configuration object for the application.

```javascript
const CONFIG = {
    JWT_WORKER_URL: 'https://your-jwt-worker.com',
    AI_WORKER_URL: 'https://your-ai-worker.com',
    ENABLE_JWT: false,
    ENABLE_GITHUB_MODELS: true,
    MAX_TEXT_LENGTH: 1000
};
```

## 🚀 Deployment

### GitHub Pages
The application can be deployed to GitHub Pages:

1. Enable GitHub Pages in repository settings
2. Select "Deploy from a branch" and choose `main`
3. The application will be available at `https://username.github.io/MarkdownGPT`

### Custom Deployment
Deploy to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Firebase Hosting

## 🐛 Troubleshooting

### Common Issues

#### CDN Resources Not Loading
If you see "marked is not defined" errors:
1. Check your internet connection
2. Try using a VPN if CDN access is blocked
3. The application includes fallback handling for offline usage

#### AI Processing Errors
- Verify your AI worker endpoints are accessible
- Check if JWT authentication is properly configured
- Ensure text length is within limits (1000 characters)

#### Export Not Working
- Check if your browser allows file downloads
- Try using the copy to clipboard feature instead
- Ensure pop-ups are not blocked

### Getting Help
- Check the [Issues](https://github.com/kedster/MarkdownGPT/issues) section
- Create a new issue with detailed error information
- Include browser console logs when reporting bugs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Acknowledgments

- Built with [Marked.js](https://marked.js.org/) for Markdown processing
- Syntax highlighting powered by [Highlight.js](https://highlightjs.org/)
- AI processing capabilities through Cloudflare Workers
- Icons and emojis for enhanced user experience

## 🔗 Links

- [Live Demo](https://kedster.github.io/MarkdownGPT)
- [Issues](https://github.com/kedster/MarkdownGPT/issues)
- [Pull Requests](https://github.com/kedster/MarkdownGPT/pulls)
- [Discussions](https://github.com/kedster/MarkdownGPT/discussions)

---

**Made with ❤️ by the MarkdownGPT team**
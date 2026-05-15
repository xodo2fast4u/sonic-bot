<h1 align="center">Sonic</h1>

<p align="center"> <img src="https://files.catbox.moe/0acrqb.webp" alt="Sonic-bot" /> </p>

<p align="center">
  <a href="https://deepwiki.com/xodo2fast4u/sonic-bot">
    <img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki">
  </a>
</p>

Sonic WhatsApp bot streamlines group management, enhances user engagement and
delivers instant responses at lightning speed. This professional grade bot
transforms WhatsApp into a powerful platform for community management and user
interaction.

## Disclaimer

**IMPORTANT**: Sonic is provided for educational and personal use purposes only.
Please ensure you:

- **Use responsibly**: Do not spam, harass or send unwanted messages to users
- **Respect privacy**: Handle user data with care and respect their privacy
- **No commercial use**: Sonic is not intended for commercial purposes without
  proper authorization
- **Legal compliance**: Ensure your use complies with local laws and regulations

The developers are not responsible for any misuse of sonic or any consequences
arising from its use. Users are solely responsible for their actions and must
ensure they have proper consent before adding sonic to groups or sending
messages.

> [!WARNING] WhatsApp may suspend or ban accounts that violate their terms of
> service. Use sonic at your own risk.

## Features

### Technical Features

- **Lightning Fast**: Optimized for speed and performance
- **Modular Design**: Easy to extend with new commands
- **Permission System**: Admin-only commands with proper checks
- **Auto-Save Configuration**: Persistent settings
- **Emoji-Rich Interface**: Beautiful, colorful responses

## Prerequisites for Local Installation

Before cloning and running Sonic on your laptop or computer ensure you have the
following installed:

### Windows

- [Node.js & npm](https://nodejs.org/) (Download the installer)
- [Git](https://git-scm.com/download/win)
- Terminal app (built-in)

### macOS

- [Node.js & npm](https://nodejs.org/) (Download the installer or use Homebrew:
  `brew install node`)
- [Git](https://git-scm.com/download/mac) (or install via Homebrew:
  `brew install git`)
- Terminal app (built-in)

### Linux

- [Node.js & npm](https://nodejs.org/en/download) (Follow the official
  instructions)
- [Git](https://git-scm.com/install/linux) (Follow the official instructions for
  your distribution)
- Terminal app (built-in)

**Verify installation:**

```bash
node --version
npm --version
git --version
```

Once these are installed, you can proceed to clone the repository and follow the
installation steps in Below.

## Quick Start

### Installation

1. **Clone or download sonic**

   ```bash
   git clone https://github.com/xodo2fast4u/sonic-bot.git
   cd sonic-bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   npm i
   ```

3. **Configure environment**

   ```bash
   # Sonic will create a .env file automatically
   # Or create one manually with:
   # For Linux And Mac OS
   touch .env

   # For Windows
   > .env
   ```

4. **Run sonic**

   ```bash
   npm start
   ```

5. **Connect WhatsApp**
   - Sonic will prompt for your phone number
   - Enter your number with country code (e.g., 27724913058)
   - Check your phone for the pairing code
   - Enter the pairing code when prompted

## Configuration

Sonic uses a `.env` file for configuration. It will be created automatically or
you can create it manually:

```env
# Sonic Configuration
PREFIX=!                    # Command prefix
OWNER_NUMBER=27724913058   # Bot owner number not necessary to be filled will be auto filled once paired
BOT_NAME=Sonic             # Bot display name
```

### Configuration Options

| Variable       | Description                     | Default |
| -------------- | ------------------------------- | ------- |
| `PREFIX`       | Command prefix for bot commands | `!`     |
| `OWNER_NUMBER` | Bot owner WhatsApp number       | Empty   |
| `BOT_NAME`     | Bot display name                | `Sonic` |

## Development

### Adding New Commands

1. **Create a new command file** in the appropriate folder:

2. **Command structure**:

   ```javascript
   export default {
     cmd: ['command', 'alias'], // Command names an alias is optional
     desc: 'Command description', // Help text
     run: async text => {
       // Your command logic here
     },
   }
   ```

3. **Use utilities**:
   - `text()` - Send text messages
   - `mention()` - Send messages with mentions
   - `react()` - React to message
   - `edit()` - Edit sent message
   - `checkPerms()` - Check user permissions
   - `jid` helpers - Handle WhatsApp IDs

### Example Command

```javascript
import { emoji as e } from '../../config.js'

export default {
  cmd: ['hello'],
  desc: 'Greet the bot',

  run: async text => {
    await text(`${e.sonic} Hello! I'm Sonic!`)
  },
}
```

## Security & Privacy

- **No Data Storage**: Messages are not stored permanently
- **Owner-Only Commands**: Sensitive commands restricted to bot owner
- **Permission Checks**: Proper permission validation for group commands

> [!IMPORTANT]
>
> 1. **Phone Number**: Use your personal for fun WhatsApp number (not business)
> 2. **Internet Connection**: Stable internet required
> 3. **Session Persistence**: Auth session saved in `sonic_session.db` file
> 4. **Rate Limiting**: WhatsApp may rate-limit if commands are spammed
> 5. **Privacy**: Bot respects WhatsApp's privacy settings

## Deployment Options

Sonic can be run on various platforms besides your local machine/PC:

### Termux (Android)

Run Sonic on your Android device using Termux:

1. **Install Termux** from F-Droid or Google Play Store
2. **Update and install dependencies**
   ```bash
   pkg update && pkg upgrade
   pkg install nodejs git
   ```
3. **Clone and setup Sonic**
   ```bash
   git clone https://github.com/xodo2fast4u/sonic-bot.git
   cd sonic-bot
   npm install or npm i
   ```
4. **Run Sonic**
   ```bash
   npm start
   ```
5. **Pair WhatsApp** as usual

**Tips:**

- Keep Termux open or use a process manager like `pm2` (`npm install -g pm2`)
- Keep your device plugged in for uninterrupted operation

### Optiklink

You can deploy Sonic on [Optiklink](https://optiklink.net/home) for cloud-based
hosting:

1. **Sign up** and create a new project
2. **Deploy Sonic**
   - Choose Node.js runtime
   - Upload Sonic zip
   - Unzip and move content to root
   - Set environment variables (`PREFIX`, `OWNER_NUMBER`, `BOT_NAME`)
3. **Configure .env** via Optiklink's environment settings or let Sonic
   auto-create it
4. **Run**
   - Optiklink will start your bot and keep it running 24/7
   - Monitor logs and bot status from the dashboard

**Benefits:**

- Always-on hosting
- No need to keep your device running
- Easy deployment and monitoring

## Troubleshooting

### Common Issues

**Bot doesn't respond**

- Check if bot is connected (`!ping` command)
- Verify prefix is correct
- Ensure bot is in the group (for group commands)

**Authentication fails**

- Delete `sonic_session.db` and other files named `sonic_session`
- Restart bot and re-authenticate
- Check phone number format (include country code)

**Commands not working**

- Verify bot has necessary permissions
- Check group admin status for admin commands
- Ensure proper command syntax

**Performance issues**

- Check system resources
- Restart bot if running for extended periods
- Monitor internet connection stability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your command or improvement
4. Test thoroughly
5. Submit a pull request

### Development Guidelines

- Follow existing code style
- Add proper error handling
- Include command descriptions
- Test with various scenarios

## Support

For issues, questions or contributions:

- Create an issue in the repository
- Check existing documentation
- Review code examples

---

**Made with ❤️ by Xodobyte**

_Gotta go fast!_ 🦔💨

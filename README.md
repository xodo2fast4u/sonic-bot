<h1 align="center">Sonic</h1>

<p align="center"> <img src="https://files.catbox.moe/0acrqb.webp" alt="Sonic-bot" /> </p>

<p align="center">
  <a href="https://deepwiki.com/xodo2fast4u/sonic-bot">
    <img src="https://img.shields.io/badge/DeepWiki-Ask%20DeepWiki-0078D4?style=for-the-badge" alt="Ask DeepWiki" />
  </a>
  <a href="https://github.com/xodo2fast4u/sonic-bot/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-2E8B57?style=for-the-badge" alt="License: MIT" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/node.js-22.17%2B-339933?logo=node.js&style=for-the-badge" alt="Node.js 22.17+" />
  </a>
  <a href="https://github.com/GIScience/badges#active">
    <img src="https://img.shields.io/badge/status-active-2ECC71?style=for-the-badge" alt="Status: active" />
  </a>
</p>

Sonic WhatsApp bot streamlines group management, enhances user engagement and delivers instant responses at lightning speed. This professional grade bot transforms WhatsApp into a powerful platform for community management and user interaction.

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

> [!CAUTION]
> WhatsApp may suspend or ban accounts that violate their terms of
> service. Use sonic at your own risk.

## Why Sonic?

Sonic combines several capabilities into one bot experience:

- Group and community management tools for admins
- An economy system with balances, work, daily rewards, inventory and leaderboards
- Chat utilities such as labels, presence, quick replies and status handling
- A modular command architecture that makes it straightforward to add new features

## Features

### Technical Features

- **Lightning Fast**: Optimized for speed and performance
- **Modular Design**: Easy to extend with new commands
- **Permission System**: Admin-only commands with proper checks
- **Auto-Save Configuration**: Persistent authentication and environment settings
- **Emoji-Rich Interface**: Beautiful, colorful responses

### Core capabilities

- **Group management**: add, kick, promote, demote, mute, unmute, invite links, tag-all, group info and admin tools
- **Newsletter management**: follow, unfollow, mute and unmute newsletter, react, admincount and change owner
- **Economy system**: balance, work, beg, daily rewards, deposit, withdraw, pay, inventory, fish, hunt, mine, shop, rob, stats and leaderboards
- **Gambling and risk games**: coinflip, dice, roulette, slots, crash and blackjack for fast mini-game action
- **Tools and maker features**: sticker generation, weather, wiki, search, calculator, image tools, encoding/decoding and utility commands
- **Owner controls**: participant toggles, welcome/goodbye controls, promote/demote toggles and maintenance actions. Owner message toggles currently apply until the bot restarts; persistent toggle configuration is planned.

## Prerequisites

Install the following before running Sonic locally:

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
installation steps below.

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/xodo2fast4u/sonic-bot.git
cd sonic-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. **Configure environment**

```bash
# Sonic doesn't create a .env file automatically
# You must create one manually with:
# For Linux And Mac OS
touch .env

# For Windows
> .env
```

Example:

```env
SONIC_PREFIX=!
OWNER_NUMBER=
```

### 4. **Run sonic**

```bash
npm start
```

### 5. **Connect WhatsApp**

- Sonic will prompt for your phone number
- Enter your number with country code and without the `+` sign (e.g., 27724913058)
- Check your phone for WhatsApp notification to enter pairing code displayed in terminal
- You have successfully connected sonic

## Configuration

Sonic reads configuration from `.env` and a built-in config module.

| Variable       | Description                               | Default                                      |
| -------------- | ----------------------------------------- | -------------------------------------------- |
| `SONIC_PREFIX` | Command prefix for bot commands           | `!`                                          |
| `OWNER_NUMBER` | Owner number used for owner-only features | (empty, auto-filled upon successful pairing) |

## Project structure

The main code lives under [src](src) and the folders are organized like this:

| Path                             | Purpose                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| [src/core](src/core)             | Message handling, routing, socket lifecycle, dependency injection and shared state |
| [src/commands](src/commands)     | Command implementations grouped by category                                        |
| [src/services](src/services)     | Business logic for user and economy features                                       |
| [src/database](src/database)     | SQLite access, repositories and migrations                                         |
| [src/config](src/config)         | Bot configuration and environment helpers                                          |
| [src/utils](src/utils)           | Logging, cooldowns, formatting and shared utilities                                |
| [src/cache](src/cache)           | Session and cache management                                                       |
| [src/monitoring](src/monitoring) | Health checks and metrics collection                                               |
| [src/security](src/security)     | Audit logging and security-related utilities                                       |
| [src/validation](src/validation) | Input validation                                                                   |
| [src/data](src/data)             | Where Economy Database gets created and lives                                      |
| [types](types)                   | TypeScript declarations for project dependencies and modules                       |

## Command overview

The command registry automatically loads command modules from the category folders in [src/commands](src/commands). The currently implemented command families are:

- General: `!ping`, `!info`, `!menu`, `!about`, `!profile`, `!runtime`, `!server`, `!speed`, `!owner`
- Economy: `!balance`, `!daily`, `!work`, `!beg`, `!deposit`, `!withdraw`, `!pay`, `!inventory`, `!leaderboard`, `!shop`, `!fish`, `!hunt`, `!mine`, `!rob`, `!stats`
- Gambling: `!coinflip`, `!dice`, `!roulette`, `!slots`, `!crash`, `!blackjack`
- Group: `!ginfo`, `!groupcreate`, `!grouplist`, `!tagall`, `!mute`, `!unmute`, `!promote`, `!demote`, `!kick`, `!leave`, `!link`, `!groupmode`, `!join`, `!admins`, `!setname`, `!setdesc`, `!lock`, `!unlock`, `!add`, `!ephemeral`, `!revoke`, `!groupinvite`, `!grouprequest`, `!groupv4`
- Tools: `!bible`, `!calculate`, `!decode`, `!define`, `!directions`, `!encode`, `!image`, `!name`, `!search`, `!songrecommendation`, `!wallpaper`, `!weather`, `!wiki`
- Maker: `!sticker`, `!brat`, `!hd`
- Newsletter: `!newslettermanage`, `!newsletteractions`
- Owner: `!participantson`, `!participantsoff`, `!promoterdemoteon`, `!promoterdemoteoff`, `!welcomegoodbyeon`, `!welcomegoodbyeoff`, `!additem`, `!removeitem`, `!setbalance`, `!resetcooldown`

## Development

### Test and lint

Run the full test suite and lint checks locally:

```bash
npm test
npm run lint
```

For the Jest coverage report and configured coverage thresholds run:

```bash
npm run test:coverage
```

### Adding a new command

1. Create a new file in the appropriate folder inside [src/commands](src/commands), such as [src/commands/general](src/commands/general) or [src/commands/economy](src/commands/economy).
2. Export a command object with `cmd`, `desc`, and `run`.
3. Keep the logic focused and use the shared helpers for text replies, mentions, reactions, edits, and images.

Example:

```javascript
import { emoji as e } from '../../config/config.js';

export default {
  cmd: ['hello'],
  desc: 'Greet the bot',
  run: async ({ text }) => {
    await text(`${e.sonic} Hello! I'm Sonic!`);
  },
};
```

The command loader scans each folder and picks up new files automatically, so adding a new module usually only requires creating the file.

### Useful helpers

- `text(message)` sends a plain text reply.
- `mention(text, mentions)` sends a reply with mentions.
- `react(emoji, key)` reacts to a message.
- `edit(key, text)` edits an existing outgoing message.
- `image(source, caption, mimetype)` sends an image message from a URL or buffer. The MIME type is optional.
- `sticker(buffer)` sends a sticker buffer as a quoted sticker message.

## Security & Privacy

- **No Message Storage**: Messages are not stored permanently
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

### Termux (Android)

Run Sonic on your Android device using Termux:

1. **Install Termux** from F-Droid or Google Play Store
2. **Update and install dependencies**
   ```bash
   pkg update && pkg upgrade
   pkg install nodejs-lts git clang make python pkg-config
   ```
3. **Clone and setup Sonic**

   ```bash
   git clone https://github.com/xodo2fast4u/sonic-bot.git
   cd sonic-bot
   npm install
   #or
   npm i
   ```

4. **Build the native SQLite module for Android ARM64**
   `better-sqlite3` uses a native Node addon and must be compiled for Android ARM64 inside Termux:

   ```bash
   cd node_modules/better-sqlite3
   npm run build-release
   cd ../..
   ```

   You can verify the native module was created with:

   ```bash
   ls node_modules/better-sqlite3/build/Release
   ```

   You should see:

   `better_sqlite3.node`

5. **Create and setup .env file**

   ```bash
   touch .env
   printf 'SONIC_PREFIX=!\nOWNER_NUMBER=\n' > .env
   ```

6. **Keep Termux active**

   Before starting Sonic, acquire a wake lock so Android is less likely to suspend the Termux process while you switch to other apps or turn the screen off:

   ```bash
   termux-wake-lock
   ```

   This helps keep Sonic active while it is running.

7. **Run Sonic**

   ```bash
   npm start
   ```

8. **Pair WhatsApp** as usual

   When you no longer need Sonic running, release the wake lock:

   ```bash
   termux-wake-unlock
   ```

**Recommended:**

- `termux-wake-lock` will show a pop-up to disable Android battery optimization for Termux if you intend to keep Sonic running for long periods if the pop-up does not show up, manually disable Android battery optimization for Termux. Android may otherwise suspend or terminate Termux independently of the wake lock.

### Cloud hosting

Sonic can also be deployed on services such as [Optiklink](https://optiklink.net/home) or similar Node.js hosts. Make sure to:

1. Upload the repository contents.
2. Install dependencies with `npm install`.
3. Set the required environment variable `SONIC_PREFIX`.
4. Start the bot with `npm start`.

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

We welcome contributions! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide for detailed information on:

- Code style and formatting standards
- File organization and naming conventions
- How to write tests
- Git workflow and commit message guidelines
- Security best practices
- Performance considerations

Quick start:

1. Fork the repository
2. Install dependencies: `npm install`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes and test: `npm test`
5. Format and type-check: `npm run format && npm run type-check`
6. Submit a pull request

For detailed guidance, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

For issues, questions or contributions:

- Create an issue in the repository
- Check existing documentation
- Review code examples

## License

This project is under the [MIT License](./LICENSE)

---

**Made with ❤️ by Xodobyte**

_Gotta go fast!_ 🦔💨

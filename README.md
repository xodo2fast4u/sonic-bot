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

Sonic is a self-hosted WhatsApp bot for community management and member engagement. It handles admin tools, economy systems, mini-games and modular commands in one place, making group chats more interactive with a virtual economy and run smoother with less manual work.

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
- **Economy system**: balance, work, beg, scavenge, deliver, craft, daily rewards, deposit, withdraw, pay, inventory, fish, hunt, mine, shop, rob, robbank, stats and leaderboards
- **Gambling and risk games**: coinflip, dice, roulette, slots, crash and blackjack for fast mini-game action
- **Tools and maker features**: sticker generation, weather, wiki, search, calculator, image tools, encoding/decoding and utility commands
- **Downloader**: Play youtube songs
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
FFMPEG_PATH=ffmpeg
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
| `FFMPEG_PATH`  | Path or command used to run FFmpeg        | `ffmpeg`                                     |
| `NODE_ENV`     | Runtime environment                       | `production`                                 |

`NODE_ENV` accepts `development`, `production` or `test`:

- `development`: enables debug commands and command hot reload, uses debug logging and stores the database in `./data/sonic_dev.db`.
- `production`: disables debug commands and hot reload, uses info logging and stores the database in `./data/sonic.db`.
- `test`: disables hot reload, uses error logging and uses an in-memory database.

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

- General: `!ping`, `!info`, `!menu`, `!about`, `!profile`, `!runtime`, `!server`, `!speed`, `!owner`, `!modestatus`
- RPG & Combat: `!fight`, `!train`, `!equip`, `!unequip`, `!togglelevelup`, `!profile`
- Economy: `!balance`, `!daily`, `!weekly`, `!monthly`, `!yearly`, `!work`, `!beg`, `!scavenge`, `!deliver`, `!craft`, `!deposit`, `!withdraw`, `!pay`, `!inventory`, `!transactions`, `!leaderboard`, `!shop`, `!fish`, `!hunt`, `!mine`, `!rob`, `!robbank`, `!stats`, `!sell`, `!use`, `!interest`, `!gift`, `!heist`, `!bounty`, `!invest`, `!networth`, `!vault`, `!career`
- Gambling: `!coinflip`, `!dice`, `!roulette`, `!slots`, `!crash`, `!blackjack`, `!higherlower`, `!poker`, `!baccarat`, `!mines`, `!plinko`, `!derby`, `!keno`, `!wheel`, `!limbo`, `!war`, `!cups`
- Group: `!ginfo`, `!groupcreate`, `!grouplist`, `!tagall`, `!mute`, `!unmute`, `!promote`, `!demote`, `!kick`, `!leave`, `!link`, `!groupmode`, `!join`, `!admins`, `!setname`, `!setdesc`, `!lock`, `!unlock`, `!add`, `!ephemeral`, `!revoke`, `!groupinvite`, `!grouprequest`, `!groupv4`
- Tools: `!bible`, `!calculate`, `!decode`, `!define`, `!directions`, `!encode`, `!image`, `!name`, `!search`, `!songrecommendation`, `!wallpaper`, `!weather`, `!wiki`
- Voice changer: `!deep`, `!chipmunk`, `!robot`, `!echo`, `!reverb`, `!bass`, `!nightcore`, `!underwater`, `!radio`, `!megaphone`
- Downloader: `!play`
- Maker: `!sticker`, `!brat`, `!hd`
- Newsletter: `!newslettermanage`, `!newsletteractions`
- Owner: `!mode`, `!participantson`, `!participantsoff`, `!promoterdemoteon`, `!promoterdemoteoff`, `!welcomegoodbyeon`, `!welcomegoodbyeoff`, `!additem`, `!removeitem`, `!setbalance`, `!resetbalances`, `!resetcooldown`

### Operating modes

Sonic starts in **public** mode and persists the chosen mode in SQLite across restarts. Only numbers in `OWNER_NUMBER` can change the mode. Anyone can check it with `!modestatus` or `!mode`.

| Mode                 | Behaviour                                                                             |
| -------------------- | ------------------------------------------------------------------------------------- |
| `public`             | Responds to commands everywhere (groups + DMs). Default.                              |
| `private`            | Responds only in DMs / private chats; ignores group commands.                         |
| `self`               | Responds everywhere but only to `OWNER_NUMBER`.                                       |
| `admin` (one group)  | `!mode admin` in a group that group becomes admin-only; everywhere else stays normal. |
| `admin` (all groups) | `!mode admin all` every group is admin-only; DMs still work for everyone.             |

Owners always bypass mode restrictions so they can manage the bot. Restricted users are ignored silently (no reply spam). Welcome/promote participant messages are suppressed in `private` and `self` modes.

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
2. Export a command object with `cmd`, `desc` and `run`.
3. Keep the logic focused and use the shared helpers for text replies, mentions, reactions, edits and images.

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
- `voice(audio, waveform, seconds)` sends a WhatsApp voice note using an Opus payload with `ptt: true` and waveform metadata for voice commands.
- `getTarget(msg)` returns the first mentioned user or the sender of a quoted message or `null` when no target is present.
- `resolveSender(msg)` returns the message sender and handles group participants and LID fallbacks.

In development, command files are watched and reloaded automatically. Edit,
add or delete a JavaScript file under `src/commands` and use the command again
without restarting Sonic. The registry logs `Command source change detected`
and `Command registry hot reload complete`, including added, updated and
deleted command aliases. Set `NODE_ENV=production` to disable this watcher.

### Voice changer requirements

Voice commands process a sent or quoted audio message with the system `ffmpeg`
executable or the executable configured with `FFMPEG_PATH`. FFmpeg must include
the `libopus` encoder. On Linux, install the distribution's FFmpeg package and
verify it with:

```bash
ffmpeg -encoders | grep libopus
```

Each command sends a WhatsApp-compatible mono Opus voice note with a generated
waveform. No `audio-decode` package is required.

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

   Sonic requires **Node.js 22.17+**. SQLite is provided by Node’s built-in `node:sqlite` module (no native addon or compiler toolchain required).

   ```bash
   pkg update && pkg upgrade
   pkg install nodejs-lts git ffmpeg
   ```

   Confirm your Node version is at least 22.17 (`node -v`). If Termux’s LTS package is older, install a newer Node build that meets the requirement.

3. **Clone and setup Sonic**

   ```bash
   git clone https://github.com/xodo2fast4u/sonic-bot.git
   cd sonic-bot
   npm install
   #or
   npm i
   ```

4. **Create and setup .env file**

   ```bash
   touch .env
   printf 'SONIC_PREFIX=.\nOWNER_NUMBER=\nFFMPEG_PATH=ffmpeg\n' > .env
   ```

   If FFmpeg is installed in a non-default location on Termux, set the absolute path instead:

   ```bash
   printf 'SONIC_PREFIX=.\nOWNER_NUMBER=\nFFMPEG_PATH=/data/data/com.termux/files/usr/bin/ffmpeg\n' > .env
   ```

5. **Keep Termux active**

   Before starting Sonic, acquire a wake lock so Android is less likely to suspend the Termux process while you switch to other apps or turn the screen off:

   ```bash
   termux-wake-lock
   ```

   This helps keep Sonic active while it is running.

6. **Run Sonic**

   ```bash
   npm start
   ```

   Node may print an `ExperimentalWarning` for `node:sqlite` until the API is marked stable. That warning is informational and does not change Sonic’s behavior.

7. **Pair WhatsApp** as usual

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

# FeedWise - RSS Reader

A modern RSS reader built with Next.js and PostgreSQL for storing user data and RSS subscriptions.

## Features

- User registration and authentication
- Add and manage RSS feed subscriptions
- Automatic RSS content synchronization
- Clean interface for browsing RSS entries
- Filter content by feed source
- Manual feed refresh
- 🎨 Dark/light theme switching
- Automatic system theme detection
- Optimized color contrast (WCAG compliant)
- Incremental article addition with link-based deduplication
- 👤 Role-based permission system
- Platform configuration management
- 🤖 AI-powered feed categorization using OpenAI
- 👑 Platform administrator system (SUPER_ADMIN)

## Technology Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma ORM
- NextAuth.js
- RSS Parser
- next-themes (theme management)

## User Roles

- **USER**: Regular users who can manage their own subscriptions
- **ADMIN**: Administrators with access to backend management features
- **SUPER_ADMIN**: Platform administrators with full system access and user management capabilities

The first registered user automatically becomes an ADMIN. Only SUPER_ADMIN users can promote other users to SUPER_ADMIN.

## Key Functionality

### Authentication
- Email/password-based registration and login
- Secure session management with NextAuth.js
- Default admin account (`admin@feedwise.local`) created on first startup

### Feed Management
- Add RSS feeds by URL
- Automatic RSS content parsing and import
- Manual feed refresh
- Filter articles by feed source
- Incremental article addition (duplicates prevented by link)

### Theme System
- Dark/light mode toggle
- Automatic system theme preference detection
- WCAG-compliant color contrast ratios
- Persistent theme preferences

### AI-Powered Categorization
- Automatic feed categorization using OpenAI models
- Configurable via admin panel or environment variables
- Manual categorization available via API

### Scheduled Refresh
- Configurable automatic RSS refresh intervals
- Scheduler control (start/stop/restart) from admin panel
- Built-in cron job support (seconds, minutes, hours, days)

## Database Models

### User
- Unique identifier and email
- Encrypted password
- Username and role

### Feed (RSS Subscription)
- Unique identifier and URL
- Title and description
- Category (AI-generated)
- Associated user

### Item (RSS Entry)
- Unique identifier
- Title, link, and description
- Publication date
- Associated feed

## Configuration

### Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret key for authentication
- `DEFAULT_ADMIN_PASSWORD`: Password for the default admin account

Optional (OpenAI):
- `OPENAI_BASE_URL`: OpenAI API endpoint
- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_MODEL`: Model name (e.g., `gpt-4o-mini`)

Note: OpenAI configuration can also be set in the admin panel.

### Admin Panel
Access the admin panel at `/admin` to configure:
- OpenAI API settings
- RSS refresh intervals
- Scheduler controls
- Platform settings

## Planned Features

- [x] Dark/light theme switching
- [x] Role-based permission system
- [x] Incremental article addition
- [ ] Article read status tracking
- [ ] Article bookmarks/favorites
- [ ] Search functionality
- [ ] OPML import/export
- [ ] Mobile responsive design
- [ ] Manual user creation by admin
- [ ] Multi-admin support

## Documentation

- **[User Guide](./USER_GUIDE.md)** - How to use FeedWise
- **[Admin Guide](./ADMIN_GUIDE.md)** - Admin features and configuration
- **[Theme Documentation](./THEME.md)** - Theme system details
- **[Prisma Troubleshooting](./PRISMA_TROUBLESHOOTING.md)** - Common issues and solutions
- **[API Testing](./API_TESTING.md)** - API error testing guide

## License

MIT

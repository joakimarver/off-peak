## Off-peak

This tool reads your consumption data on an hour-by-hour interval and calculates how your household performs against the average, and how much you saved by using hour metering.

This tool is possible thanks to the wonderful API (and people) at [Tibber](https://sverige.tibber.com/).

The project can be viewed and used on https://offpeak.se

### Configuring credentials

#### Server

In `server/`, copy `client.example.env` to `client.env`, fill in the application credentials from Tibber in the new file.
This is only possible (and necessary) for developers with full production access and to test the authentication.

If building a docker image and testing the production build, use `docker.env` in the project root. _This is not recommended_.

#### Running without credentials

- Start development server, both backend and frontend, see below.
- Login at https://offpeak.se
- Locate and copy the value of localStorage keys: `access_token`, `expires`
- Create those localStorage keys on the development server running at http://localhost:3000 and enter the values from the production site.

Using this method you can develop most aspects of the site, except the login flow. To use the snapshot functionality you can create your own firebase project and use those credentials.

### Setup

- Run `yarn install` in project root

### Running

Run `make run` in the `server/` folder, this starts the backend.
Run `make run` in project root, this starts the frontend dev server.

## Recent Modernization (2026)

The Off-Peak application has been modernized with the latest tools and libraries:

### Frontend Updates
- **React**: Upgraded from v17 to v18 with concurrent rendering support
- **Chart.js**: Migrated from v2.7 to v4.5 for better performance and modern API
- **React Router**: Updated from v5 to v6 with modern hooks API
- **Date Handling**: Replaced deprecated Moment.js with date-fns (smaller bundle size)
- **Redux Toolkit**: Updated to v2 with latest features
- **TypeScript**: Upgraded to v5.7 for improved type inference
- **Vite**: Updated to v6 for faster builds
- **Sentry**: Updated to v8 for better error tracking

### Backend Updates
- **Go**: Updated from Go 1.17 to Go 1.23+ 
- **Dependencies**: All Go modules updated to latest stable versions
- **Firebase SDK**: Updated to latest version

### Benefits
- ⚡ **Faster Performance**: Modern React 18 features and Chart.js 4 optimizations
- 📦 **Smaller Bundle**: Removed Moment.js, modern tree-shaking with updated libraries
- 🔒 **Better Security**: All dependencies updated to latest versions with security patches
- 🛠️ **Modern Tooling**: Latest TypeScript and Vite for improved developer experience
- 📊 **Enhanced Charts**: Chart.js 4 provides better performance and more features

### Tibber API Features Available
The modernization also researched new Tibber API features that can be added:
- Real-time consumption via WebSocket (live power usage)
- Production data for solar panels
- Enhanced price indicators (VERY_CHEAP, CHEAP, NORMAL, EXPENSIVE, VERY_EXPENSIVE)
- Tomorrow's prices when available
- More granular energy/tax cost breakdowns


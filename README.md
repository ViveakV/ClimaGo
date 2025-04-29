# ClimaGo

ClimaGo is a project that takes a city/town and provides a ranking of how desirable it will be to visit for various activities based on the weather for the next 7 days.

## Getting Started

### Prerequisites

- Node.js (v16 or above recommended)
- npm (v8 or above)

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Running the Application

To start the application locally:

```bash
npm start
```

### Running Tests

To run the test suite locally:

```bash
npm test
```

Or, if you use a specific test runner (e.g., Jest):

```bash
npx jest
```

## Project Structure

| File/Folder | Description |
|-------------|-------------|
| `src/`      | Contains the main source code for the application. |
| `src/index.js` or `src/index.ts` | Entry point of the application. |
| `src/components/` | Contains reusable UI components. |
| `src/services/` | Contains logic for API calls and business logic. |
| `package.json` | Project metadata, scripts, and dependencies. |
| `README.md` | Project documentation and instructions. |
| `_tests_/` | Contains test files for the application. |

## Technical Choices

- **Language:** [JTypeScript] was chosen for its strong ecosystem and ease of use for both frontend and backend development with the added benefit of typechecking to reduce runtime errors.
- **Framework:** [React] was selected for its component-based architecture and community support plus priod experience.
- **Testing:** [Jest] is used for unit and integration testing due to its speed and developer-friendly features.
- **Dependency Management:** npm is used for managing third-party libraries and scripts.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

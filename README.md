# Fync API

Fync API is a powerful tool that allows you to sync and manage your friends from all stages of your life in one central platform. With OAuth support for developers, you can easily integrate this API into your applications and provide a seamless experience for users to find and connect with friends.

## Table of Contents

- [Getting Started](#getting-started)
  - [Setup](#setup)
  - [Authentication](#authentication)
  - [Base URL](#base-url)
- [Endpoints](#endpoints)
- [OAuth for Developers](#oauth-for-developers)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Contributing](#contributing)
- [License](#license)

## Getting Started


### Setup

#### Prerequisites

Before you start, ensure you have the following prerequisites installed on your system:

- [Deno](https://deno.land/#installation)
- [Git](https://git-scm.com/downloads) (for cloning the repository)

#### 1. Fork the Repository

To contribute to the Fync API, you should start by forking the project repository on GitHub. Click the "Fork" button at the top-right corner of the [Fync API GitHub repository](https://github.com/fync/fync-api) to create your own fork.

#### 2. Clone Your Fork

After forking the repository, clone your forked repository to your local machine:

```bash
git clone https://github.com/your-username/fync-api.git
cd fync-api
```

#### 3. Start coding

To Install and run the project, run this command:

```bash
deno task start
```

### Authentication

To access the Fync API, you need to authenticate using OAuth. Follow these steps to obtain your API credentials:

1. Sign up for a developer account on [Fync Developer Portal](https://fync.in/dev).

2. Create a new OAuth application to obtain your `client_id` and `client_secret`.

3. Use these credentials to obtain an access token for your application. Refer to the [OAuth for Developers](#oauth-for-developers) section for more details.

### Base URL

The base URL for the Fync API is:

```
https://api.fync.in/
```
## Endpoints

[refer to this file](endpoints.md)

## OAuth for Developers

Developers can use OAuth 2.0 to authenticate and authorize access to the Fync API on behalf of their users. Detailed information on how to obtain and use OAuth tokens can be found in the [Fync OAuth Developer Guide](https://fync.com/dev/docs/oauth).

## Error Handling

In case of errors, the Fync API returns standard HTTP error codes and JSON error objects. Refer to the [API Documentation](https://fync.in/dev/docs) for details on error codes and their meanings.

## Rate Limits

The Fync API has rate limits in place to ensure fair usage. Refer to the [Rate Limits](https://fync.in/dev/docs/rate-limits) section in the API documentation for details on these limits.

## Contributing

We welcome contributions from the developer community. If you have suggestions or would like to report issues, please visit our [GitHub repository](https://github.com/fyncAPI/fync-api) to open a new issue or create a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
uses mongo driver with oak and deno
validate with zod


# NHS Innovation Service API

Explanation here

## Requirements

- Node 20
- Docker and Docker compose

## Run locally in WSL

Use Ubuntu in WSL. Put this repo and `innovation-service-transactional-frontend` next to each other in the Linux filesystem (for example, `~/NHS`). The backend creates Unix symbolic links during `npm ci`, so install it from WSL.

1. Install Node 20.18 or later within Node 20, npm, Docker with WSL integration, and Azure Functions Core Tools (`func`).
2. Set up this repo's `.env` and `local.settings.json` as described below. Set up the frontend's `.env` using its README. Keep secrets out of Git.
3. In each repo, run `npm ci`.
4. In this backend repo, start SQL Server, Azurite, Redis, and Elasticsearch:

```bash
docker compose -f .docker/docker-compose.yml up -d
```

On the first start, wait for SQL Server to be ready, then create the local databases and run migrations and seeds:

```bash
node scripts/create-local-dbs.js
npm run migrations
npm run seeds
```

Open three WSL terminals in this backend repo. Run one command in each:

```bash
npm run app:watch --function-app=admin --port=7071
npm run app:watch --function-app=innovations --port=7072
npm run app:watch --function-app=users --port=7074
```

In a fourth WSL terminal, go to the sibling frontend repo and run `npm run start:dev:ssr`. Open `http://localhost:4200`. These commands do not start the informational frontend or notifications function. Press Ctrl+C in each terminal to stop an app; use `docker compose -f .docker/docker-compose.yml down` in this backend repo to stop Docker services.

If startup fails, read the error in that terminal. Check Docker in WSL, `func`, dependencies in both repos, and the local settings.

### Instructions to install docker + docker compose on a linux ubuntu flavored environment.

```bash
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
$ sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu RELEASE stable" # Check RELEASE in "cat /etc/os-release", UBUNTU_CODENAME
$ sudo apt-get update
$ sudo apt-get install docker-ce docker-ce-cli docker-compose

$ sudo usermod -a -G docker $USER # Optional command, if errors about permissions happens when running commands
```

---

## Configuration

### 1. This project is prepared to run locally with a MSSQL DB served through Docker and Docker compose.

### 2. Install packages

```bash
$ npm install
```

This instruction will also create the symbolic links within each app as necessary.

### 3. Optional: If you prefer a clean view of the project itself, use the vscode workspaces: File > Open Workspace from file..., and choose monorepo.code-workspace file.

### 4. Environment variables

#### **Step 1**

Create ".env" file on the root of the project. These variables are only needed for running migrations and tests locally.

```js
DB_HOST=localhost
DB_USER=sa
DB_PWD=Pass@word
DB_NAME=innovationdb

DB_TESTS_HOST=localhost
DB_TESTS_USER=sa
DB_TESTS_PWD=Pass@word
DB_TESTS_NAME=tests

ADMIN_OID={secret}
```

#### **Step 2**

Create "local.settings.json" on the root of the project.
These files are needed to provide environment variables to the app function when running it. Request {secret} values from your manager.

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",

    "LOCAL_MODE": true,

    "CLIENT_WEB_BASE_URL": "http://localhost:4200",

    "DB_HOST": "localhost",
    "DB_USER": "sa",
    "DB_PWD": "Pass@word",
    "DB_NAME": "innovationdb",

    "AD_TENANT_NAME": "{secret}",
    "AD_CLIENT_ID": "{secret}",
    "AD_CLIENT_SECRET": "{secret}",
    "AD_EXTENSION_ID": "{secret}",
    "STORAGE_CONTAINER": "{secret}",
    "STORAGE_ACCOUNT": "{secret}",
    "STORAGE_BASE_URL": "{secret}",
    "STORAGE_KEY": "{secret}",
    "APPINSIGHTS_INSTRUMENTATIONKEY": "{secret}",

    "AZURE_STORAGE_CONNECTIONSTRING": "{secret}",

    "REDIS_CACHE_CONNECTIONSTRING": "{secret}",

    "ADMIN_OID": "{secret}",

    "EMAIL_NOTIFICATION_API_ISSUER": "{secret}",
    "EMAIL_NOTIFICATION_API_SECRET": "{secret}",
    "EMAIL_NOTIFICATION_API_BASE_URL": "{secret}",
    "EMAIL_NOTIFICATION_API_EMAIL_PATH": "{secret}",

    "ES_API_URL": "{secret}",
    "ES_API_KEY": "{secret}",
    "ES_INNOVATION_INDEX_NAME": "{secret}"
  }
}
```

## Running an app

### 1. Start the MSSQL DB server through docker and docker compose.

```bash
$ docker compose -f .docker/docker-compose.yml up
```

#### **Note: When running for the first time, make sure that:**

1. After SQL Server is ready, run `node scripts/create-local-dbs.js`. This creates `innovationdb` and `tests` and enables `READ_COMMITTED_SNAPSHOT` for tests.
2. Run migrations and seeds:

```bash
$ npm run migrations
$ npm run seeds
```

## Choose and start the application trought the "Run and Debug" menu (when using vscode).

## Linting an app

```bash
$ npm run app:lint --function-app=innovations
$ npm run app:lint --function-app=users
$ npm run app:lint --function-app=admin
$ npm run app:lint --function-app=notifications
$ ...

```

## Testing an app

Before being able to run tests, you must run migratins on the "tests" DB. Then you can test each app individually.

```bash
$ npm run migrations:test # Only needs to be runned once.

$ npm run app:test --function-app=innovations
$ npm run app:test --function-app=users
$ npm run app:test --function-app=admin
$ npm run app:test --function-app=notifications
$ ...

```

## Managing migrations

```bash
$ npm run migrations                                # Run pending migrations.
$ npm run seeds                                     # Run pending seeds.

$ npm run migrations:new --name=new-migration-name  # Creates a new migration file.

```

# NHS Innovation Service API

Explanation here

## Requirements

- Node 20
- Docker and Docker compose

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
$ docker-compose -f .docker/docker-compose.yml up
```

#### **Note: When running for the first time, make sure that:**

1. Create a 2 DB's manually trought Microsoft SQL Server Managemente Studio. Create "innovationdb" and "tests" DB's.
1. Run the following command to allow parallel transactions in jest: `ALTER DATABASE tests SET READ_COMMITTED_SNAPSHOT ON;`
   **Note:** you only need to run this when you create the tests database
1. Run migrations and seeds trought the commands:

```bash
$ npm run migrations
$ npm run seeds
```

## Choose and start the application trought the "Run and Debug" menu (when using vscode).

## Linting an app

```bash
$ npm run app:lint --function-app=innovations
$ npm run app:lint --function-app=users
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

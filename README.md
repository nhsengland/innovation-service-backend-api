# NHS Innovation Service API
Explanation here


## Requirements
- Node 14
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



### 5. Environment variables
#### **Step 1**

Create ".env" file on the root of the project. These variables are only needed for running migrations and tests locally.
```
DB_HOST=localhost
DB_USER=sa
DB_PWD=Pass@word
DB_NAME=innovationdb

DB_TESTS_HOST=localhost
DB_TESTS_USER=sa
DB_TESTS_PWD=Pass@word
DB_TESTS_NAME=innovationdb

ADMIN_OID={secret}
```

#### **Step 2**
Create "local.settings.json" on the root of the project.
These files are needed to provide environment variables to the app function when running it. Request {secret} values from your manager.
```
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

    "COSMOSDB_HOST": "{secret}",
    "COSMOSDB_ACCOUNT": "{secret}",
    "COSMOSDB_KEY": "{secret}",
    "COSMOSDB_DB": "{secret}",
    "COSMOSDB_PORT": "{secret}",

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

    "SLS_TTL": 300,
    "ADMIN_OID": "{secret}",

    "EMAIL_NOTIFICATION_API_ISSUER":"{secret}",
    "EMAIL_NOTIFICATION_API_SECRET":"{secret}",
    "EMAIL_NOTIFICATION_API_BASE_URL":"{secret}",
    "EMAIL_NOTIFICATION_API_EMAIL_PATH":"{secret}"

  }
}
```

## Running the app
### 1. Start the MSSQL DB server and Verdaccio (local NPM registry) through Docker and Docker compose.
```bash
$ docker-compose -f .docker/docker-compose.yml up
```
#### **Note: When running for the first make sure that:**
1. Create a 2 DB's manually trought Microsoft SQL Server Managemente Studio. Create "innovationdb" and "tests" DB's.
2. Run migrations and seeds trought the commands:
```
$ nx run migrations
$ nx run seeds
```

Press F5
---


### New Migration
TODO

# Source Code Editor

Source Code Editor is a web-based code editing platform with Git repository management. It allows you to manage, edit, and collaborate on code projects directly from your browser.

## Features

- **Project Management**: Add and manage Git repositories (clone, pull, push, commit, checkout, branch management)
- **Code Editor**: Browse and edit files within repositories with a web-based editor
- **Git Operations**: Full Git workflow support — commit, push, pull, branch management, reset
- **GitHub Integration**: Sync and track GitHub repositories, manage pull requests
- **LLM Assistance**: AI-powered code assistance via DeepSeek (configurable)
- **SSH Key Management**: Manage SSH public keys for Git over SSH access
- **User Authentication**: Multi-user support with admin/user roles and JWT-based sessions
- **OpenTelemetry**: Built-in OpenTelemetry tracing, metrics, and logs export

![Projects Screenshot](docs/images/projects.png?raw=true)
![Code Editor Screenshot](docs/images/code.png?raw=true)
![GitHub Integration Screenshot](docs/images/github.png?raw=true)

## Installation

The application is distributed as a Docker image and can be deployed with Docker Compose or Kubernetes.

To launch the application with Docker Compose:

```bash
git clone https://github.com/devopsplaybook-io/sourcecode-editor
cd sourcecode-editor/docs/deployments/docker-compose/sourcecode-editor
docker compose up -d
```

To launch the application in Kubernetes:

```bash
git clone https://github.com/devopsplaybook-io/sourcecode-editor
cd sourcecode-editor/docs/deployments/kubernetes/sourcecode-editor
kubectl kustomize . | kubectl apply -f -
```

To launch the application with the service exposed as a NodePort (for local cluster access):

```bash
git clone https://github.com/devopsplaybook-io/sourcecode-editor
cd sourcecode-editor/docs/deployments/kubernetes/sourcecode-editor-nodeports
kubectl kustomize . | kubectl apply -f -
```

## Configuration

Configuration can be provided via a JSON configuration file (using the ConfigMap) or environment variables.

See the [ConfigMap YAML](docs/deployments/kubernetes/sourcecode-editor/base/configmap.yaml) for an example configuration.

| Parameter                                               | Description                              | Default                                   | Availability                        |
| ------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- | ----------------------------------- |
| APPLICATION_TITLE                                       | Name of the application (for PWA)        | Code                                      | Environment variable                |
| DATA_DIR                                                | Directory for persistent data storage    | /data                                     | Config file or environment variable |
| JWT_KEY                                                 | Secret key for JWT token signing         | (auto)                                    | Config file or environment variable |
| JWT_VALIDITY_DURATION                                   | JWT token validity duration in seconds   | 8035200                                   | Config file or environment variable |
| CORS_POLICY_ORIGIN                                      | CORS allowed origin                      | \*                                        | Config file or environment variable |
| PROJECTS_SYNC_FREQUENCY                                 | Frequency (in ms) to sync project status | 3600000                                   | Config file or environment variable |
| GIT_USERNAME                                            | Default Git username for operations      | (empty)                                   | Config file or environment variable |
| GIT_EMAIL                                               | Default Git email for operations         | (empty)                                   | Config file or environment variable |
| LLM_API_KEY                                             | API key for LLM (DeepSeek)               | (empty)                                   | Config file or environment variable |
| LLM_API_URL                                             | LLM API endpoint URL                     | https://api.deepseek.com/chat/completions | Config file or environment variable |
| LLM_MODEL                                               | LLM model name                           | deepseek-chat                             | Config file or environment variable |
| GITHUB_TOKEN                                            | GitHub personal access token             | (empty)                                   | Config file or environment variable |
| GITHUB_SYNC_FREQUENCY                                   | Frequency (in ms) to sync GitHub repos   | 300000                                    | Config file or environment variable |
| OPENTELEMETRY_COLLECTOR_HTTP_TRACES                     | OTEL collector endpoint for traces       | (empty)                                   | Config file or environment variable |
| OPENTELEMETRY_COLLECTOR_HTTP_METRICS                    | OTEL collector endpoint for metrics      | (empty)                                   | Config file or environment variable |
| OPENTELEMETRY_COLLECTOR_HTTP_LOGS                       | OTEL collector endpoint for logs         | (empty)                                   | Config file or environment variable |
| OPENTELEMETRY_COLLECTOR_EXPORT_LOGS_INTERVAL_SECONDS    | Interval (in seconds) to export logs     | 60                                        | Config file or environment variable |
| OPENTELEMETRY_COLLECTOR_EXPORT_METRICS_INTERVAL_SECONDS | Interval (in seconds) to export metrics  | 60                                        | Config file or environment variable |
| OPENTELEMETRY_COLLECT_AUTHORIZATION_HEADER              | Authorization header for OTEL collection | (empty)                                   | Config file or environment variable |

## Development

See the [Development Guide](docs/dev/README.md) for instructions on setting up a development environment.

test 3
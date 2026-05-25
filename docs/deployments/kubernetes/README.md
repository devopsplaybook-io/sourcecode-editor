# Deploying with Kubernetes.

In the [sourcecode-editor](sourcecode-editor) directory, you will find an example of deployment using YAML files (with Kustomize)

To launch the application in Kubernetes with the default configuration:

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

# Deploying with Kubernetes.

In the [sourcecode-editor] directory, you will find an example of deployment using Yaml files (with Kustomize)

To Launch the application in Kubenetes:

```bash
git clone https://github.com/DidierHoarau/sourcecode-editor
cd sourcecode-editor/docs/deployments/kubernetes/sourcecode-editor
kubectl kustomize . | kubectl apply -f -
```

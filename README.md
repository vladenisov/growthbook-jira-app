# GrowthBook Jira App

An Atlassian Forge app for use linking Jira issues to GrowthBook features and experiments.

## Local Development

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

### Notes

- Use the `forge tunnel` command to enable hot-reloading between your computer and the development environment.
- Use the `forge deploy` command when you want to persist code changes.
- Use the `forge install` command when you want to install the app on a new site.
- Once the app is installed on a site, the site picks up the new app changes you deploy without needing to rerun the install command.

## Connecting to a self-hosted GrowthBook instance

Forge apps must specify what urls they connect to before they're published, so to use this app with a non-cloud
instance of GrowthBook you'll need to make a fork of this repo and apply a few edits

1. Create a new [Atlassian Forge app](https://developer.atlassian.com/platform/forge/build-a-hello-world-app-in-jira/) locally
2. Take the app ID from the generated `manifest.yml` and use it to replace our app ID in your fork's `manifest.yml`.
3. Update the references to `api.growthbook.io` and `app.growthbook.io` to use your corresponding URLs in both `manifest.yml` and `src/utils/consts.ts`.
4. You should end up with the following diff

```diff
diff --git a/manifest.yml b/manifest.yml
index eee3f43..5d9ba32 100644
--- a/manifest.yml
+++ b/manifest.yml
@@ -28,11 +28,11 @@ resources:
 app:
   runtime:
     name: nodejs24.x
-  id: ari:cloud:ecosystem::app/78d5cfe5-5311-4e0e-9bbd-5be2ae1eb445
+  id: generated-app-id
 permissions:
   scopes:
     - storage:app
   external:
     fetch:
       client:
-        - address: https://api.growthbook.io
+        - address: https://your-site-here.com
diff --git a/src/utils/consts.ts b/src/utils/consts.ts
index 06e8ffa..73a7234 100644
--- a/src/utils/consts.ts
+++ b/src/utils/consts.ts
@@ -1,2 +1,2 @@
-export const GB_API_HOST = "https://api.growthbook.io";
-export const GB_APP_ORIGIN = "https://app.growthbook.io";
+export const GB_API_HOST = "https://api.your-site-here.com";
+export const GB_APP_ORIGIN = "https://app.your-site-here.com";
```

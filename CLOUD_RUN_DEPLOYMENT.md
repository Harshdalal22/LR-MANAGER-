# Google Cloud Run Deployment Guide

## Problem Fixed
The deployment was failing due to an invalid Docker image name:
- ❌ **Old:** `LR-MANAGER-/biltybook` (invalid - contains trailing slash)
- ✅ **New:** `biltybook` (valid - clean name)

## Files Added
1. **Dockerfile** - Multi-stage build for production
2. **nginx.conf** - Web server configuration
3. **cloudbuild.yaml** - Cloud Build configuration
4. **.dockerignore** - Excludes unnecessary files

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)

The deployment should now work automatically when you push to GitHub:

```bash
git add .
git commit -m "fix: Update Cloud Run deployment configuration with valid image names"
git push origin main
```

Google Cloud Build will automatically:
1. Build the Docker image
2. Push to Artifact Registry
3. Deploy to Cloud Run

### Option 2: Manual Deployment

If you need to deploy manually:

```bash
# 1. Build and submit to Cloud Build
gcloud builds submit --config cloudbuild.yaml

# 2. Or deploy directly
gcloud run deploy biltybook \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated
```

## Configuration Details

### Docker Image Path
- **Registry:** `asia-south1-docker.pkg.dev`
- **Project:** `bilty-book`
- **Repository:** `cloud-run-source-deploy`
- **Image:** `biltybook`
- **Full Path:** `asia-south1-docker.pkg.dev/bilty-book/cloud-run-source-deploy/biltybook`

### Cloud Run Service
- **Name:** `biltybook`
- **Region:** `asia-south1`
- **Port:** `8080`
- **Memory:** `512Mi`
- **CPU:** `1`
- **Max Instances:** `10`
- **Authentication:** Public (unauthenticated)

## Environment Variables

If you need to add environment variables to Cloud Run:

```bash
gcloud run services update biltybook \
  --region asia-south1 \
  --set-env-vars "VITE_SUPABASE_URL=your-url,VITE_SUPABASE_ANON_KEY=your-key"
```

Or add them in the Cloud Console:
1. Go to Cloud Run → biltybook service
2. Click "Edit & Deploy New Revision"
3. Go to "Variables & Secrets" tab
4. Add your environment variables

## Verification

After deployment:

1. **Check Build Status:**
   ```bash
   gcloud builds list --limit=5
   ```

2. **Check Service Status:**
   ```bash
   gcloud run services describe biltybook --region asia-south1
   ```

3. **Get Service URL:**
   ```bash
   gcloud run services describe biltybook --region asia-south1 --format='value(status.url)'
   ```

4. **View Logs:**
   ```bash
   gcloud run services logs read biltybook --region asia-south1
   ```

## Troubleshooting

### Build Fails
- Check `cloudbuild.yaml` syntax
- Verify Artifact Registry repository exists
- Check Cloud Build service account permissions

### Deployment Fails
- Verify the image was pushed successfully
- Check Cloud Run service account permissions
- Review logs in Cloud Console

### App Not Working
- Check environment variables are set
- Verify Supabase credentials
- Check nginx.conf routing rules
- Review application logs

## Next Steps

1. Commit and push the new files
2. Monitor the Cloud Build trigger
3. Once deployed, test the application
4. Configure custom domain (optional)
5. Set up monitoring and alerts

## Cost Optimization

Current configuration:
- **Min Instances:** 0 (scales to zero when idle)
- **Memory:** 512Mi (sufficient for React app)
- **CPU:** 1 (adequate for most traffic)

To reduce costs further:
- Keep min instances at 0
- Monitor actual usage and adjust resources
- Use Cloud CDN for static assets (optional)

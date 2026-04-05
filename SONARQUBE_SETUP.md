# SonarQube + GitLab CI/CD Setup for GOLO Backend

## Overview
This guide sets up **SonarQube for code quality analysis** + **GitLab CI/CD pipeline** for your GOLO Backend project.

---

## Step 1: Choose SonarQube Platform

### Option A: SonarCloud (Cloud-Based - Recommended)
✅ No server setup needed  
✅ Free for public/open-source projects  
✅ Automatic updates

**Setup:**
1. Go to https://sonarcloud.io
2. Sign up with your GitHub account
3. Click "Import organization from GitHub"
4. Select your repository

### Option B: Self-Hosted SonarQube Server
For on-premises deployment:

```bash
# Using Docker
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts

# Access at: http://localhost:9000
# Default: admin/admin
```

---

## Step 2: Create SonarQube Project

1. **Log in to SonarCloud/SonarQube**
2. **Create New Project**
   - Project key: `golo-ads-service`
   - Project name: `GOLO Backend - ADS Service`
   - Visibility: Private
3. **Generate Token**
   - Go to: My Account → Security → Generate Token
   - Name: `gitlab-ci-token`
   - Expiration: 1 year
   - Copy the token (you'll need it next)

---

## Step 3: Add GitLab CI/CD Variables

In your GitLab project:

1. Go to **Settings → CI/CD → Variables**
2. Add these variables:

```
SONAR_HOST_URL = https://sonarcloud.io
  (or http://your-sonarqube-host:9000 for self-hosted)

SONAR_TOKEN = <paste-token-from-step-2>
  Mark as: Protected, Masked

CI_REGISTRY = registry.gitlab.com
  (or your private Docker registry)

CI_REGISTRY_USER = <your-gitlab-username>

CI_REGISTRY_PASSWORD = <your-gitlab-personal-access-token>
```

---

## Step 4: Test the Pipeline

### First Run:
```bash
# Push to trigger pipeline
git add .
git commit -m "feat: add SonarQube integration"
git push -u origin feature/sonarqube-setup
```

### View Pipeline:
1. Go to **CI/CD → Pipelines** in GitLab
2. Watch stages execute:
   - ✅ **lint** - ESLint analysis
   - ✅ **build** - NestJS build
   - ✅ **sonarqube** - SonarQube scan
   - ✅ **test** - Unit tests
   - ✅ **deploy** - Deployment (manual)

### View SonarQube Results:
1. Go to SonarCloud dashboard
2. Check your project `golo-ads-service`
3. Review metrics:
   - **Issues**: Bugs, vulnerabilities, code smells
   - **Coverage**: Test code coverage %
   - **Duplication**: Code duplication %
   - **Quality Gate**: Pass/Fail status

---

## Step 5: Configure Quality Gate

### SonarQube → Quality Gates
1. Go to **Quality Gates**
2. Edit "Default" or create new gate
3. Set thresholds:
   ```
   ✅ Coverage: >= 80%
   ✅ Duplicated Lines: < 3%
   ✅ Maintainability Rating: >= A
   ✅ Security Rating: >= A
   ✅ Reliability Rating: >= A
   ```

### GitLab Merge Request Checks
1. Go to **Project → Settings → Merge Requests**
2. Enable:
   - ✅ Require all pipeline jobs to succeed
   - ✅ Require code reviews
   - ✅ Auto-merge when pipeline succeeds (optional)

---

## Step 6: Monitor Code Quality

### Daily Checks:
- **Dashboard**: https://sonarcloud.io/dashboard?id=golo-ads-service
- **Issues Page**: Filter by severity, type, date
- **Trends**: Track improvements over time

### Slack Integration (Optional):
Add Sonar notifier to send quality updates to Slack.

---

## Current Project Status

### Lint Errors: **850/1037 (18% fixed)**
Working files to complete:
- users.service.ts (150+ errors - complex db operations)
- ads.service.ts (63+ errors - MongoDB aggregations)
- kafka.controller.ts (63 errors - message handling)
- reports.gateway.ts (32 errors - WebSocket handling)
- payments.service.ts (28 errors)

### Next Steps for Full Cleanup:
```bash
# View remaining errors
pnpm lint

# Auto-fix what you can
pnpm exec eslint src/ --fix

# Run SonarQube locally
sonar-scanner \
  -Dsonar.projectKey=golo-ads-service \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=<YOUR_TOKEN>
```

---

## Troubleshooting

### Pipeline fails at sonarqube stage?
```bash
# Check variables are set
echo $SONAR_HOST_URL
echo $SONAR_TOKEN

# Run locally to test
sonar-scanner -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.login=${SONAR_TOKEN}
```

### "Project key already exists"?
- Use unique project key: `golo-ads-service-dev`, `golo-ads-service-prod`

### Coverage not showing?
- Ensure tests run: `npm run test:cov`
- Add to `.gitlab-ci.yml`: Coverage report paths

---

## Commands Reference

```bash
# Run linter
pnpm lint

# Run tests with coverage
pnpm test:cov

# Build project
pnpm build

# Local SonarQube scan
sonar-scanner -Dsonar.projectKey=golo-ads-service

# Check specific file
pnpm exec eslint src/users/users.service.ts
```

---

## Resources

- SonarCloud: https://sonarcloud.io
- SonarQube Docs: https://docs.sonarqube.org
- GitLab CI/CD: https://docs.gitlab.com/ee/ci/
- NestJS Testing: https://docs.nestjs.com/fundamentals/testing

---

**Setup completed!** Your CI/CD pipeline is now monitoring code quality. 🚀

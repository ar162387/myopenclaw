# Deploy to EC2 on push

The workflow [Deploy to EC2](.github/workflows/deploy-ec2.yml) runs on every **push to `main`**. It SSHs to your EC2 instance, pulls the repo, builds (with `OPENCLAW_A2UI_SKIP_MISSING=1`), and restarts the OpenClaw gateway service.

## GitHub secrets

In your GitHub repo: **Settings → Secrets and variables → Actions**, add:

| Secret           | Required | Description |
|------------------|----------|-------------|
| `EC2_HOST`       | Yes      | EC2 public IP or hostname (e.g. `13.60.205.0`) |
| `EC2_SSH_KEY`    | Yes      | Full contents of your `.pem` private key (paste the entire file) |
| `EC2_USER`       | No       | SSH user (default: `ubuntu`) |
| `EC2_REPO_DIR`   | No       | Path to repo on EC2 (default: `/home/ubuntu/myopenclaw`) |

## EC2 requirements

- Repo already cloned on EC2 at the chosen path (e.g. `~/myopenclaw`).
- SSH access: the key you put in `EC2_SSH_KEY` must be the one used for `EC2_USER@EC2_HOST` (e.g. the key pair attached to the instance or in `~/.ssh/authorized_keys`).
- Node 22, pnpm, and `systemctl --user` available; OpenClaw gateway installed as a user service (`openclaw-gateway.service`).

## What the workflow does

1. Checkout the repo (so the deploy script is available).
2. Configure SSH with `EC2_SSH_KEY` and connect to `EC2_HOST`.
3. On EC2, run `scripts/deploy-ec2.sh` with the branch name and repo path. The script:
   - `git fetch` / `git reset --hard origin/<branch>`
   - `pnpm install --frozen-lockfile`
   - `OPENCLAW_A2UI_SKIP_MISSING=1 pnpm build` and `pnpm ui:build`
   - `systemctl --user restart openclaw-gateway.service`

## Trigger

- **Push to `main`** only. To deploy other branches, change `branches` in `.github/workflows/deploy-ec2.yml` or add another workflow.

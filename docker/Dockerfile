# Dockerfile

#ARG PROXY_ADDR="http://host.docker.internal:7890" Linxux 下使用 host.docker.internal 可能会有问题，建议使用实际的代理地址
FROM python:3.10-slim-bookworm AS builder

ARG DEBIAN_FRONTEND=noninteractive
ARG PRO_ADDR

RUN if [ -n "$PROXY_ADDR" ]; then \
    printf 'Acquire::http::Proxy "%s";\nAcquire::https::Proxy "%s";\n' "$PROXY_ADDR" "$PROXY_ADDR" > /etc/apt/apt.conf.d/99proxy; \
    fi && \
    apt-get update && \
    apt-get install -y --no-install-recommends curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/* && \
    if [ -n "$PROXY_ADDR" ]; then rm -f /etc/apt/apt.conf.d/99proxy; fi

ENV HTTP_PROXY=${PROXY_ADDR}
ENV HTTPS_PROXY=${PROXY_ADDR}

# -- Bulletproof Poetry Installation & Verification --
ENV POETRY_VERSION=1.8.3
RUN \
    # 步骤 1: 安装 poetry
    echo "--- [DEBUG] 正在安装 Poetry..." && \
    curl -sSL https://install.python-poetry.org | python3 - --version ${POETRY_VERSION} && \
    \
    # 步骤 2: 验证 poetry 可执行文件的原始位置
    echo "--- [DEBUG] 验证 /root/.local/bin/poetry 是否存在..." && \
    ls -la /root/.local/bin/poetry && \
    \
    # 步骤 3: 创建符号链接
    echo "--- [DEBUG] 正在创建符号链接到 /usr/local/bin/poetry..." && \
    ln -s /root/.local/bin/poetry /usr/local/bin/poetry && \
    \
    # 步骤 4: 在这个 RUN 指令的末尾，验证符号链接是否成功创建
    echo "--- [DEBUG] 在安装层，验证符号链接是否存在且有效..." && \
    ls -la /usr/local/bin/poetry && \
    \
    # 步骤 5: 尝试直接通过符号链接执行 version 命令，如果失败，构建会在这里就中止
    echo "--- [DEBUG] 在安装层，尝试通过绝对路径执行 'poetry --version'..." && \
    /usr/local/bin/poetry --version

WORKDIR /app_builder
COPY pyproject.toml poetry.lock ./

# -- Pre-execution Check & Run --
RUN \
    # 步骤 1: 在这个新的 RUN 指令开始时，再次验证符号链接是否存在
    echo "--- [DEBUG] 在执行层，再次验证 /usr/local/bin/poetry 是否可见..." && \
    ls -la /usr/local/bin/poetry && \
    \
    # 步骤 2: 现在，正式执行我们的命令
    echo "--- [DEBUG] 正在执行 poetry install..." && \
    /usr/local/bin/poetry config virtualenvs.create false --local && \
    /usr/local/bin/poetry install --no-root --no-dev --no-interaction --no-ansi

FROM python:3.10-slim-bookworm

ARG DEBIAN_FRONTEND=noninteractive
ARG PROXY_ADDR

ENV HTTP_PROXY=${PROXY_ADDR}
ENV HTTPS_PROXY=${PROXY_ADDR}

# 步骤 1: 安装所有系统依赖。
RUN \
    if [ -n "$PROXY_ADDR" ]; then \
    printf 'Acquire::http::Proxy "%s";\nAcquire::https::Proxy "%s";\n' "$PROXY_ADDR" "$PROXY_ADDR" > /etc/apt/apt.conf.d/99proxy; \
    fi && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxrender1 libxtst6 ca-certificates fonts-liberation libasound2 libpangocairo-1.0-0 libpango-1.0-0 libu2f-udev \
    supervisor curl \
    && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    if [ -n "$PROXY_ADDR" ]; then rm -f /etc/apt/apt.conf.d/99proxy; fi

RUN groupadd -r appgroup && useradd -r -g appgroup -s /bin/bash -d /app appuser

WORKDIR /app

# 步骤 2: 复制文件
COPY --from=builder /usr/local/lib/python3.10/site-packages/ /usr/local/lib/python3.10/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY --from=builder /usr/local/bin/poetry /usr/local/bin/poetry

# 复制应用代码
COPY . .

# 步骤 3: 运行应用命令
RUN camoufox fetch && \
    python -m playwright install firefox

# 创建目录和设置权限
RUN mkdir -p /app/logs && \
    mkdir -p /app/auth_profiles/active && \
    mkdir -p /app/auth_profiles/saved && \
    mkdir -p /app/certs && \
    mkdir -p /app/browser_utils/custom_scripts && \
    mkdir -p /home/appuser/.cache/ms-playwright && \
    mkdir -p /home/appuser/.mozilla && \
    chown -R appuser:appgroup /app && \
    chown -R appuser:appgroup /home/appuser

COPY supervisord.conf /etc/supervisor/conf.d/app.conf

# 修复 camoufox 缓存逻辑
RUN mkdir -p /var/cache/camoufox && \
    if [ -d /root/.cache/camoufox ]; then cp -a /root/.cache/camoufox/* /var/cache/camoufox/; fi && \
    mkdir -p /app/.cache && \
    ln -s /var/cache/camoufox /app/.cache/camoufox

RUN python update_browserforge_data.py

# 清理代理环境变量
ENV HTTP_PROXY=""
ENV HTTPS_PROXY=""

EXPOSE 2048
EXPOSE 3120

USER appuser
ENV HOME=/app
ENV PLAYWRIGHT_BROWSERS_PATH=/home/appuser/.cache/ms-playwright

ENV PYTHONUNBUFFERED=1
# (后续 ENV 和 CMD 保持不变)
ENV PORT=8000
ENV DEFAULT_FASTAPI_PORT=2048
ENV DEFAULT_CAMOUFOX_PORT=9222
ENV STREAM_PORT=3120
ENV SERVER_LOG_LEVEL=INFO
ENV DEBUG_LOGS_ENABLED=false
ENV AUTO_CONFIRM_LOGIN=true
ENV SERVER_PORT=2048
ENV INTERNAL_CAMOUFOX_PROXY=""

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/app.conf"]
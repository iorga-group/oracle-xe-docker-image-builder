FROM alekzonder/puppeteer:1.7.0-0
#FROM node:8-alpine

# Inspired by https://raw.githubusercontent.com/rastasheep/alpine-node-chromium/03b592d3017f502eb6280f9e91d47b3f7fdf14c8/8-alpine/Dockerfile + fix by https://github.com/rastasheep/alpine-node-chromium/issues/7#issuecomment-416455657
# `-> had the following problem node:8) UnhandledPromiseRejectionWarning: Error: Failed to launch chrome! spawn /app/node_modules/puppeteer/.local-chromium/linux-588429/chrome-linux/chrome ENOENT
# Then copied hints from https://github.com/GoogleChrome/puppeteer/blob/395c50624cdd82efa5516201d587b7e578944acf/docs/troubleshooting.md#running-puppeteer-in-docker pointed out by https://github.com/GoogleChrome/puppeteer/issues/379#issuecomment-328491195
#  & modified some lines to install chromium instead chrome (`apt-get install -y chromium chromium-l10n` and `CMD ["chromium-browser"]`)
#  `-> but had "/app/node_modules/puppeteer/.local-chromium/linux-588429/chrome-linux/chrome: error while loading shared libraries: libatk-bridge-2.0.so.0: cannot open shared object file: No such file or directory"
# `-> back to alpine-node-chromium copy adding libc6-compat, still got "__sbrk: symbol not found" kind of problems

#RUN apk update && apk upgrade && \
## Install only chromium dependencies because puppeteer is using its own chromium + libc6-compat to avoid "node:8) UnhandledPromiseRejectionWarning: Error: Failed to launch chrome! spawn /app/node_modules/puppeteer/.local-chromium/linux-588429/chrome-linux/chrome ENOENT"
#    apk add --no-cache gcompat libc6-compat $(apk info --depends chromium | sed '1d')

#RUN apk update && apk upgrade && \
#    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
#    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
#    apk add --no-cache \
#      chromium@edge \
#      nss@edge
#
##RUN apk --no-cache update \
##  && apk --no-cache upgrade \
##  && apk add --no-cache \
##    gifsicle pngquant optipng libjpeg-turbo-utils \
### libc6-compat added after a ldd on /app/node_modules/puppeteer/.local-chromium/linux-588429/chrome-linux/chrome which indicated "Error loading shared library ld-linux-x86-64.so.2: No such file or directory"
##    udev ttf-opensans chromium libc6-compat \
##  && rm -rf /var/cache/apk/* /tmp/*
#
#
## It's a good idea to use dumb-init to help prevent zombie chrome processes.
#ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 /usr/local/bin/dumb-init
#RUN chmod +x /usr/local/bin/dumb-init
#
#RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
#    && mkdir -p /home/pptruser/Downloads /app \
#    && chown -R pptruser:pptruser /home/pptruser /app
#
## Run user as non privileged.
#USER pptruser
#
#ENTRYPOINT ["dumb-init", "--"]
##CMD ["google-chrome-unstable"]
#CMD ["chromium-browser"]
#
#ENV CHROME_BIN /usr/bin/chromium-browser

COPY package.json /app/
COPY yarn.lock /app/

USER root
RUN chown -R pptruser:pptruser /app/*
USER pptruser

RUN cd /app && yarn

COPY downloader.js /app/

USER root
RUN chown -R pptruser:pptruser /app/downloader.js
USER pptruser

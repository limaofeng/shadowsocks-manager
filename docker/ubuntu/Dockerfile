FROM ubuntu:18.04
MAINTAINER gyteng <igyteng@gmail.com>

COPY . /ssmgr

WORKDIR /ssmgr

RUN pwd && ls

RUN apt-get update && \
    export DEBIAN_FRONTEND=noninteractive && \
    apt-get install tzdata iproute2 curl git sudo software-properties-common python-pip -y && \
    pip install git+https://github.com/gyteng/shadowsocks.git@master && \
    curl -sL https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y nodejs shadowsocks-libev && \
    echo "Asia/Shanghai" > /etc/timezone && \
    rm /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

# npm i -g shadowsocks-manager --unsafe-perm && \
RUN npm install && npm link /ssmgr

CMD ["/usr/bin/ssmgr"]
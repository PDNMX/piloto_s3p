FROM node:12

ADD . /piloto_s3p
WORKDIR /piloto_s3p


RUN yarn add global yarn \
&& yarn install \
&& yarn cache clean


EXPOSE 8080

CMD ["yarn", "start"]

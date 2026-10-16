# GOAT League · panel admin (sitio estatico) para EasyPanel
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
RUN rm -f /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/nginx.conf /usr/share/nginx/html/vercel.json /usr/share/nginx/html/README.md
EXPOSE 80

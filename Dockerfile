# La web es HTML autocontenido: no hay nada que compilar, solo servirlo.
# Nginx y no un servidor de Node porque la unica necesidad real es servir
# archivos bien cacheados, y eso nginx lo hace de fabrica.
FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/gruppocristiano.conf

COPY index.html robots.txt /usr/share/nginx/html/
COPY sedi.js fede.js app.js almacen.js mapa.js /usr/share/nginx/html/
COPY media/ /usr/share/nginx/html/media/
# El panel. Va en su carpeta para que la direccion sea /panel.
# Si esta linea falta, la pagina existe en el repositorio y da 404 en
# produccion: el encargado abre el enlace y no hay nada.
COPY panel/ /usr/share/nginx/html/panel/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

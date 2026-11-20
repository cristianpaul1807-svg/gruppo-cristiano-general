# La web es HTML autocontenido: no hay nada que compilar, solo servirlo.
# Nginx y no un servidor de Node porque la unica necesidad real es servir
# archivos bien cacheados, y eso nginx lo hace de fabrica.
FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/gruppocristiano.conf

# Se copia la carpeta entera y lo que no va se queda fuera por .dockerignore.
#
# Antes se listaba archivo por archivo, que es mas explicito, pero ahora cada
# iglesia es una carpeta —parma/, fidenza/...— y el dia que se anada una y
# nadie se acuerde de tocar este archivo, la pagina existiria en el
# repositorio y daria 404 en produccion. Eso es exactamente lo que no puede
# pasar: el encargado manda el enlace de su iglesia por WhatsApp y no abre.
COPY . /usr/share/nginx/html/

# nginx.conf no se puede dejar fuera con .dockerignore —lo necesita el COPY
# de arriba del todo—, asi que entra con el resto y aqui se quita. Sin esto,
# cualquiera podia descargarse la configuracion del servidor en /nginx.conf.
# Comprobado con un nginx de verdad: antes daba 200.
RUN rm -f /usr/share/nginx/html/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

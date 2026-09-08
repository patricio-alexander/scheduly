import type { NextConfig } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  basePath,
  experimental: {
    proxyClientMaxBodySize: "64mb",
    serverActions: {
      bodySizeLimit: "64mb",
    },
  },
  async redirects() {
    return [
      { source: "/products", destination: "/inventario/productos", permanent: true },
      { source: "/inventory/products", destination: "/inventario/productos", permanent: true },
      { source: "/inventory/units", destination: "/inventario/unidades", permanent: true },
      { source: "/inventory/categories", destination: "/inventario/categorias", permanent: true },
      { source: "/agenda", destination: "/operacion/agenda", permanent: true },
      { source: "/tasks", destination: "/operacion/tareas", permanent: true },
      { source: "/customers", destination: "/ventas/clientes", permanent: true },
      { source: "/users", destination: "/administracion/usuarios", permanent: true },
      { source: "/roles", destination: "/administracion/roles", permanent: true },
      { source: "/settings", destination: "/sistema/configuracion", permanent: true },
      { source: "/plans", destination: "/sistema/configuracion", permanent: true },
      { source: "/modules", destination: "/sistema/configuracion", permanent: true },
      { source: "/sistema/planes", destination: "/sistema/configuracion", permanent: true },
      { source: "/sistema/modulos", destination: "/sistema/configuracion", permanent: true },
      { source: "/profile", destination: "/sistema/perfil", permanent: true },
      { source: "/notifications", destination: "/sistema/notificaciones", permanent: true },
    ];
  },
};

export default nextConfig;

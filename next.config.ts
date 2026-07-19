import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
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
      { source: "/plans", destination: "/sistema/planes", permanent: true },
      { source: "/modules", destination: "/sistema/modulos", permanent: true },
      { source: "/profile", destination: "/sistema/perfil", permanent: true },
      { source: "/notifications", destination: "/sistema/notificaciones", permanent: true },
    ];
  },
};

export default nextConfig;

# Conectar cotizaexamen.cl a GitHub Pages

1. **Repositorio**: sube este proyecto a GitHub (rama `main`).
2. **Pages**: Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
3. **Dominio**: en Settings → Pages → *Custom domain* escribe `cotizaexamen.cl` y guarda
   (el archivo `public/CNAME` ya lo declara). Cuando el certificado esté listo, marca **Enforce HTTPS**.
4. **DNS** (en NIC Chile o en el proveedor de DNS que uses). Para el dominio raíz (apex) crea:

   | Tipo | Nombre | Valor |
   |------|--------|-------|
   | A    | @      | 185.199.108.153 |
   | A    | @      | 185.199.109.153 |
   | A    | @      | 185.199.110.153 |
   | A    | @      | 185.199.111.153 |
   | AAAA | @      | 2606:50c0:8000::153 |
   | AAAA | @      | 2606:50c0:8001::153 |
   | AAAA | @      | 2606:50c0:8002::153 |
   | AAAA | @      | 2606:50c0:8003::153 |
   | CNAME | www   | `<tu-usuario>.github.io.` |

   (Confirma las IP vigentes en la documentación oficial de GitHub Pages antes de configurarlas.)
5. **Verificación**: `nslookup cotizaexamen.cl` debe devolver las IP de arriba. La propagación puede tardar
   desde minutos hasta 24 h.
6. **Recomendado**: verifica el dominio en tu cuenta de GitHub (Settings → Pages → Add a domain) para evitar
   secuestro del dominio.

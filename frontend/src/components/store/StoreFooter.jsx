import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext.jsx';
import { resolveBrandLogoAlt, resolveBrandLogoUrl } from '../../config/brandLogo.js';
import { resolveFooterLayout, resolveFooterOptions } from '../../utils/footerLayout.js';
import StoreLogo from './StoreLogo.jsx';

function FooterLink({ item, textColor }) {
  const isExternal = item.link?.startsWith('http');
  const className = 'text-sm hover:opacity-70 transition-opacity block';
  const style = { color: textColor };
  if (isExternal) {
    return (
      <a href={item.link} target="_blank" rel="noreferrer" className={className} style={style}>
        {item.label}
      </a>
    );
  }
  return (
    <Link to={item.link || '/'} className={className} style={style}>
      {item.label}
    </Link>
  );
}

export default function StoreFooter() {
  const { settings, footerNav, headerNav } = useStore();
  const storeName = settings.registry_company_name || settings.store_name || 'KoseliXpress';
  const logoUrl = resolveBrandLogoUrl({ footerNav, headerNav, settings, placement: 'footer' });
  const logoAlt = resolveBrandLogoAlt({ footerNav, headerNav, settings });
  const opts = resolveFooterOptions(footerNav?.footerOptions);
  const layout = resolveFooterLayout(footerNav);

  return (
    <footer style={{ backgroundColor: opts.backgroundColor, color: opts.textColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {layout.showLogo !== false && (
            <div className="lg:col-span-3 flex lg:block justify-center lg:justify-start">
              <Link to="/" className="inline-block" aria-label={storeName}>
                <StoreLogo
                  src={logoUrl}
                  alt={logoAlt}
                  storeName={storeName}
                  variant="footer"
                />
              </Link>
            </div>
          )}

          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 ${layout.showLogo !== false ? 'lg:col-span-9' : 'lg:col-span-12'}`}>
            {layout.linkColumns.map((col, ci) => (
              <div key={ci}>
                <h3 className="text-sm font-bold mb-3 sm:mb-4" style={{ color: opts.headingColor }}>
                  {col.title}
                </h3>
                <ul className="space-y-2 sm:space-y-2.5">
                  {(col.items || []).filter((item) => item.label).map((item, ii) => (
                    <li key={ii}>
                      <FooterLink item={item} textColor={opts.textColor} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-10 sm:mt-12 pt-8 sm:pt-10 border-t"
          style={{ borderColor: opts.borderColor }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {(layout.infoColumns || []).map((col, ci) => (
              <div key={ci} className="space-y-4 sm:space-y-5">
                {(col.items || []).filter((item) => item.label || item.value).map((item, ii) => (
                  <div key={ii}>
                    <p className="text-sm font-bold mb-1" style={{ color: opts.headingColor }}>
                      {item.label}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: opts.textColor }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

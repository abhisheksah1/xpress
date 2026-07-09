import { Link } from 'react-router-dom';
import { isExternalCmsLink, resolveCmsHref } from '../../utils/cmsLinks.js';

export default function CmsNavLink({ to, className, children, onClick }) {
  const href = resolveCmsHref(to);
  if (!href) return null;

  if (isExternalCmsLink(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer" onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

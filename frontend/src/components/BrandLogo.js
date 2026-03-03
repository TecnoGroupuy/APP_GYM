import React, { useEffect, useMemo, useState } from 'react';

const sizeMap = {
  sm: {
    subtitle: 'text-[10px]',
    logoBox: 'h-28 min-w-[220px] max-w-[320px]'
  },
  md: {
    subtitle: 'text-xs',
    logoBox: 'h-20 min-w-[180px] max-w-[280px]'
  },
  lg: {
    subtitle: 'text-sm',
    logoBox: 'h-24 min-w-[220px] max-w-[340px]'
  }
};

const API_BASE_URL = process.env.REACT_APP_API_URL;
let cachedRemoteLogo;
let remoteLogoPromise = null;

const loadRemoteLogo = async () => {
  if (cachedRemoteLogo !== undefined) return cachedRemoteLogo;
  if (!remoteLogoPromise) {
    remoteLogoPromise = fetch(`${API_BASE_URL}/public/landing-data`)
      .then((response) => response.json().catch(() => ({})).then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        cachedRemoteLogo = ok ? data.logoUrl || '' : '';
        return cachedRemoteLogo;
      })
      .catch(() => {
        cachedRemoteLogo = '';
        return '';
      });
  }
  return remoteLogoPromise;
};

const BrandLogo = ({
  size = 'md',
  subtitle = '',
  subtitleClassName = '',
  className = '',
  logoUrl = '',
  boxClassName = '',
  imgClassName = ''
}) => {
  const styles = sizeMap[size] || sizeMap.md;
  const [remoteLogo, setRemoteLogo] = useState(() => {
    if (logoUrl) return logoUrl;
    if (cachedRemoteLogo !== undefined) return cachedRemoteLogo;
    try {
      return localStorage.getItem('bootcamp_logo_url') || undefined;
    } catch (_error) {
      return undefined;
    }
  });

  useEffect(() => {
    if (logoUrl) {
      setRemoteLogo(logoUrl);
      cachedRemoteLogo = logoUrl;
      try {
        localStorage.setItem('bootcamp_logo_url', logoUrl);
      } catch (_error) {
        // sin persistencia
      }
      return;
    }

    if (remoteLogo !== undefined) return;
    loadRemoteLogo().then((value) => {
      setRemoteLogo(value);
      try {
        localStorage.setItem('bootcamp_logo_url', value || '');
      } catch (_error) {
        // sin persistencia
      }
    });
  }, [logoUrl, remoteLogo]);

  const resolvedLogo = useMemo(() => logoUrl || remoteLogo || '', [logoUrl, remoteLogo]);
  return (
    <div className={`inline-flex flex-col leading-none uppercase font-black tracking-tight ${className}`}>
      {resolvedLogo ? (
        <div className={`${styles.logoBox} ${boxClassName} flex items-center justify-center overflow-hidden`}>
          <img
            src={resolvedLogo}
            alt="Boot Camp"
            className={`h-full w-full object-contain object-center ${imgClassName}`}
            loading="lazy"
          />
        </div>
      ) : (
        <div className={`${styles.logoBox} ${boxClassName}`} />
      )}
      {subtitle ? (
        <div className={`${styles.subtitle} uppercase tracking-wider mt-1 ${subtitleClassName}`}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};

export default BrandLogo;


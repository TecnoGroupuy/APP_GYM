import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../utils/apiBase';

const sizeMap = {
  sm: {
    subtitle: 'text-[10px]',
    logoBox: 'h-16 w-[170px] sm:h-20 sm:w-[210px]'
  },
  md: {
    subtitle: 'text-xs',
    logoBox: 'h-16 w-[180px] sm:h-20 sm:w-[240px]'
  },
  lg: {
    subtitle: 'text-sm',
    logoBox: 'h-20 w-[220px] sm:h-24 sm:w-[280px] lg:h-28 lg:w-[340px]'
  }
};

let cachedRemoteLogo;
let remoteLogoPromise = null;

const loadRemoteLogo = async () => {
  if (cachedRemoteLogo !== undefined) return cachedRemoteLogo;
  if (!remoteLogoPromise) {
    remoteLogoPromise = fetch(`${API_BASE_URL}/public/landing-data`)
      .then((response) => response.json().catch(() => ({})).then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        cachedRemoteLogo = ok ? data.logoUrl || '' : '';
        if (cachedRemoteLogo) {
          const preloadImage = new Image();
          preloadImage.src = cachedRemoteLogo;
        }
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
  imgClassName = '',
  imgLoading = 'lazy',
  imgFetchPriority = 'auto'
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
    <div className={`inline-flex max-w-full flex-col leading-none uppercase font-black tracking-tight ${className}`}>
      {resolvedLogo ? (
        <div className={`${styles.logoBox} ${boxClassName} max-w-full flex items-center justify-center overflow-hidden`}>
          <img
            src={resolvedLogo}
            alt="Boot Camp"
            className={`h-full w-full max-w-full object-contain object-center ${imgClassName}`}
            loading={imgLoading}
            fetchPriority={imgFetchPriority}
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


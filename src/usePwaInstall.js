import { useEffect, useState } from 'react';

export function usePwaInstall() {
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
    const onInstallAvailable = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onInstallAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setInstallEvent(null);
    return choice.outcome === 'accepted';
  };

  return { canInstall: Boolean(installEvent) && !installed, installed, install };
}

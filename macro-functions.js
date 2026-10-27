// Copy this namespace into a RoomOS macro project.
const tmeRoomOSCustomIcons = (() => {
  let manifestDirectory = '';

  async function list() {
    const manifestUrl = 'https://ctg-tme.github.io/Custom-RoomOS-Panel-Icons/manifest.json';
    manifestDirectory = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);

    const response = await xapi.Command.HttpClient.Get({
      Url: manifestUrl,
      ResultBody: 'PlainText',
    });
    const statusCode = Number(response.StatusCode);
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Manifest request failed with HTTP ${response.StatusCode}`);
    }

    return JSON.parse(response.Body);
  }

  async function upload(iconName, panelId) {
    if (typeof iconName !== 'string' || !iconName.trim()) {
      throw new Error('iconName must be an icon name or slug.');
    }
    if (typeof panelId !== 'string' || !panelId.trim()) {
      throw new Error('panelId is required.');
    }

    const manifest = await list();
    if (!manifest || !Array.isArray(manifest.icons)) {
      throw new Error('The icon manifest does not contain an icons list.');
    }

    const requestedName = iconName.trim().toLowerCase();
    const icon = manifest.icons.find((entry) =>
      entry.slug.toLowerCase() === requestedName || entry.name.toLowerCase() === requestedName
    );
    if (!icon) {
      throw new Error(`Icon not found in manifest: ${iconName}`);
    }

    const iconUrl = `${manifestDirectory}${icon.svg}`;
    const download = await xapi.Command.UserInterface.Extensions.Icon.Download({ Url: iconUrl });
    const iconId = download.IconId;
    if (!iconId) {
      throw new Error(`RoomOS did not return an IconId for ${icon.slug}.`);
    }

    await xapi.Command.UserInterface.Extensions.Panel.Update({
      IconId: iconId,
      Icon: 'Custom',
      PanelId: panelId,
    });

    return { Message: 'Icon Applied', PanelId: panelId, IconId: iconId };
  }

  return { list, upload };
})();

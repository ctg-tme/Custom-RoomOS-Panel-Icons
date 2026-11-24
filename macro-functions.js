// Copy this namespace into a RoomOS macro project.
const tmeRoomOSCustomIcons = (() => {
  const repositoryUrl = 'https://ctg-tme.github.io/Custom-RoomOS-Panel-Icons/';
  const installedIcons = Object.create(null);

  async function list() {
    let response;
    try {
      response = await xapi.Command.HttpClient.Get({
        Url: `${repositoryUrl}manifest.json`,
        ResultBody: 'PlainText',
      });
    } catch (error) {
      throw error;
    }

    const statusCode = Number(response.StatusCode);
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Manifest request failed with HTTP ${response.StatusCode}`);
    }

    return JSON.parse(response.Body);
  }

  function normalizeOptions(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('options must be an object with an optional boolean padding property.');
    }
    const padding = options.padding === undefined ? true : options.padding;
    if (typeof padding !== 'boolean') {
      throw new Error('options.padding must be true or false.');
    }
    return { padding };
  }

  function validateIconName(iconName) {
    if (typeof iconName !== 'string' || !iconName.trim()) {
      throw new Error('iconName must be an icon name or slug.');
    }
    return iconName.trim().toLowerCase();
  }

  function validatePanelId(panelId) {
    if (typeof panelId !== 'string' || !panelId.trim()) {
      throw new Error('panelId is required.');
    }
    return panelId.trim();
  }

  function getPaddingKey(padding) {
    return padding ? 'base' : 'noPad';
  }

  function findInstalled(iconName, options = {}) {
    const requestedName = validateIconName(iconName);
    const { padding } = normalizeOptions(options);
    return Object.values(installedIcons).find((entry) =>
      entry.padding === padding &&
      (entry.slug.toLowerCase() === requestedName || entry.name.toLowerCase() === requestedName)
    ) || null;
  }

  async function install(iconName, options = {}) {
    const requestedName = validateIconName(iconName);
    const { padding } = normalizeOptions(options);

    const manifest = await list();
    if (!manifest || !Array.isArray(manifest.icons)) {
      throw new Error('The icon manifest does not contain an icons list.');
    }

    const icon = manifest.icons.find((entry) =>
      entry.slug.toLowerCase() === requestedName || entry.name.toLowerCase() === requestedName
    );
    if (!icon) {
      throw new Error(`Icon not found in manifest: ${iconName}`);
    }

    const pngPath = padding ? (icon.base_png || icon.png) : icon.noPad_png;
    if (!pngPath) {
      throw new Error(`No ${padding ? 'base' : 'noPad'} PNG is available for ${icon.slug}.`);
    }

    const iconUrl = `${repositoryUrl}${pngPath}`;
    const download = await xapi.Command.UserInterface.Extensions.Icon.Download({ Url: iconUrl });
    const iconId = download.IconId;
    if (!iconId) {
      throw new Error(`RoomOS did not return an IconId for ${icon.slug}.`);
    }

    const key = `${icon.slug.toLowerCase()}|${getPaddingKey(padding)}`;
    installedIcons[key] = {
      iconId,
      name: icon.name,
      slug: icon.slug,
      padding,
    };

    return { Message: 'Icon Installed', IconId: iconId, IconName: icon.name, Padding: padding };
  }

  async function update(iconName, panelId, options = {}) {
    const { padding } = normalizeOptions(options);
    const requestedPanelId = validatePanelId(panelId);
    const installed = findInstalled(iconName, { padding });
    if (!installed) {
      const requestedName = validateIconName(iconName);
      const paddingName = padding ? 'standard' : 'reduced';
      throw new Error(`Icon '${requestedName}' with ${paddingName} padding is not installed. Call install() first.`);
    }

    await xapi.Command.UserInterface.Extensions.Panel.Update({
      IconId: installed.iconId,
      Icon: 'Custom',
      PanelId: requestedPanelId,
    });

    return { Message: 'Icon Applied', PanelId: requestedPanelId, IconId: installed.iconId, Padding: padding };
  }

  async function upload(iconName, panelId, options = {}) {
    const installed = await install(iconName, options);
    return update(iconName, panelId, { padding: installed.Padding });
  }

  return { list, install, update, upload, findInstalled, installedIcons };
})();

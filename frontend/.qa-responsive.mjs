export default async function run(page, ui) {
  const url = 'http://localhost:5199/login';
  await page.waitForSelector('.auth-panel');
  await page.waitForTimeout(1200);

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'mobile-small', width: 360, height: 640 },
    { name: 'landscape', width: 740, height: 360 },
  ];

  const results = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url);
    await page.waitForSelector('.auth-form-content');
    await page.waitForSelector('.initial-boot-splash', { state: 'detached', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const panel = document.querySelector('.auth-panel').getBoundingClientRect();
      const wrapper = document.querySelector('.arboris-auth-wrapper');
      const content = document.querySelector('.auth-panel-wrapper.active .auth-form-content').getBoundingClientRect();
      const cs = getComputedStyle(wrapper);
      return {
        scrollW: doc.scrollWidth,
        clientW: doc.clientWidth,
        scrollH: doc.scrollHeight,
        viewportH: window.innerHeight,
        panelW: Math.round(panel.width),
        panelH: Math.round(panel.height),
        panelTop: Math.round(panel.top),
        panelBottom: Math.round(panel.bottom),
        contentW: Math.round(content.width),
        alignContent: cs.alignContent,
        alignItems: cs.alignItems,
        paddingTop: cs.paddingTop,
      };
    });
    await page.screenshot({ path: `.qa-${viewport.name}.png`, fullPage: false });
    results.push({ viewport: viewport.name, ...metrics });
  }

  return results;
}

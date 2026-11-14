import asyncio, json, time
from pathlib import Path
from playwright.async_api import async_playwright

OUT=Path(__file__).resolve().parent
TMP=OUT.parents[1]/'tmp'/'browser'; TMP.mkdir(parents=True,exist_ok=True)

async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=await browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
    page=await context.new_page(); requests=[]; errors=[]
    page.on('request',lambda r:requests.append({'url':r.url,'method':r.method,'type':r.resource_type}))
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    await page.goto('http://127.0.0.1:8765/',wait_until='networkidle')
    await page.screenshot(path=str(TMP/'initial_desktop.png'),full_page=True)
    result={'browser':browser.version,'requests':requests,'errors':errors,'title':await page.title(),'initialControls':await page.locator('button:visible,select:visible,input:visible').evaluate_all('(els)=>els.map(e=>({id:e.id,text:e.textContent?.trim(),type:e.type,disabled:e.disabled}))'),'bodyText':await page.locator('body').inner_text(),'initialHeavyRequests':[r for r in requests if any(x in r['url'] for x in ['/models/','/runtime/','pdf.mjs','pdf.worker','tesseract','engine.worker'])]}
    await page.set_viewport_size({'width':390,'height':844})
    await page.screenshot(path=str(TMP/'initial_mobile.png'),full_page=True)
    result['mobileDimensions']=await page.evaluate('({width:innerWidth,documentWidth:document.documentElement.scrollWidth})')
    (OUT/'initial_ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in result.items() if k not in ['bodyText','initialControls']},ensure_ascii=False))
    await browser.close()

asyncio.run(main())

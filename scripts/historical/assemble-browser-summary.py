from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parent.parent;e=r/'evidence/browser';j=json.loads((e/'CP18_BROWSER_EVIDENCE.json').read_text());old=json.loads((e/'54cf-browser-with-offline-and-journal.json').read_text());large=next(x for x in old['results'] if x['name'].startswith('Actual licensed journal49'))
steps=[
 {'test':'Source correction/config cancellation recovery','result':'PASS_TESTED_FLOW','observed':'10 μM→20 μM; change glossary; cancel after1block on intermediateCP18; finalreload restores20μM andoriginal10μM. ResumeandZIP preserveboth. main.js source behavior unchanged; finalexport currentbuild.','evidence':'consumer-final-edit-reload.zip'},
 {'test':'Manual target persistence/retry','result':'PASS_TESTED_FLOW','observed':'Exact editedtarget survivedreload/resume; unchanged-config rerun retained it. Exportstatus edited; sourcewarning remains visible.','evidence':'consumer-final-edit-reload.zip'},
 {'test':'Two tabs','result':'PASS_TESTED_FLOW','observed':'TabB resume whileTabA ownsjob returns: Progres sedang dibuka di tab lain. Tutup tab tersebut lalu coba kembali. No secondwriter accepted.','scope':'ActualChrome; not BFCacheeligibility.'},
 {'test':'Keyboard','result':'PASS_BOUNDED','observed':'Tab aftertarget editor focusesLihat halaman sumber; Tab afterZIP button focusesdownload-source. Controls exposeaccessible labels; visiblefocusobserved.','scope':'Bounded keyboard inspection; nofullWCAG certification orscreenreadertest.'},
 {'test':'Responsive','result':'PASS_BOUNDED','observed':'Consumer390px iframe nohorizontaloverflow; desktop1363px scrollwidth1348.','scope':'Viewportchecks, notphysicalmobile.'},
 {'test':'Rendernewexports','result':'PASS_BOUNDED','observed':'Actualbrowserrenders preserved< > ≤ Unicode𝑥/ASCIIx, ∅,intervals,identifier andformulaimages. Tablecells translatedwith10mg/20mg relationships intact. Outcome label remainsEnglish; nosemanticperfectionclaim.','evidence':'fresh-exports/'},
 {'test':'BFCache,nativequota,physicalminimumdevice','result':'NOT_VERIFIED','observed':'No genuineeligibleBFCache orphysicaldevice/nativequota exhaustion evidence available.'}
]
report={'build':j['build'],'environment':{k:j[k]for k in ['userAgent','platform','hardwareConcurrency','deviceMemory']},'scope':'Localmanagedpreviewonly. Activeprivatewebsite/Cloudflare deploymentnotchanged.','actualFinalBuildTests':[{'name':x['name'],'executionPass':x['pass'],'ms':x['ms'],'error':x.get('error')}for x in j['results']],
 'diagnosticInterpretation':'Localhostingheaders andmanifest-diagnostic pass meanmeasurementcollected, notacceptancepassed. RootHTMLactualhash differsfromexpected; main.jsmatches. StaticofflineinstallationFAIL, not waived.',
 'largeJournal':{'result':large,'build':old['build'],'sourceEquivalence':'PDFreader/layout/OCRmodules unchangedbetween54cf andfinal7a8e. Onlysemanticspans classifierchanged; no49pagefinalbuild rerun claimed.'},
 'consumerSteps':steps,'memoryLimits':'performance.memory samples coverpageJSheap atboundaries, exclude worker/WASM/nativeallocations andarenotpeakRSS/CPU measurements. CPU/RSS recordedseparatelyforNodeenginecomparison.',
 'originOffline':'BLOCKED_LOCAL_ENVIRONMENT: previewreturns13271HTMLbytes vs12059builtbytes. Hashguardretained. Cachedmodelreadiness alone doesnotprovefreshPDF/OCRend-to-endwithoutorigin.',
 'privacy':'Coldstartpage resourcelistcontainsown-originlightmodules only; heavyassets loadedondemand. App/runtimeconfiguredsameorigin. Noindependentnetworkcaptureofallworkertraffic orproductionheaderclaim.',
 'deployment':'NOT_DEPLOYED; noownerpublicationorrollbackperformed','humanApproval':False}
(e/'BROWSER_E2E_CP18.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(len(j['results']),'final browser measurements; static offline remains failed')

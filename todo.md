# looking at my repo C:\Devel\_Datastar\brmLiability\ use the main tabuator grid in liability as a base
8    <!-- Datastar Pro + Rocket -->
      159    <script type="module" src="/static/datastar-pro.js"><\/script>
      160    <script type="module" src="/static/datastar-inspector.js"><\/script>
      161 -  <!- Yes, both lines are correct. The <\/script> is necessary because this HTML is inside a JavaScript template literal (backticks in server.
          -js). If you wrote a
      162 -     literal </script>, the browser's HTML parser would interpret it as closing an outer <script> tag and break the page.
      163 -     <\/script> — the backslash escapes the forward slash in the JS string, producing </script> in the actual HTML output sent to the browser.
          --->
 About 140K tokens would be ~70% of the 200K context window.
   /cost 
   /status

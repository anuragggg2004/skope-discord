/* ==========================================================================
   SKOPE — Bot Developer Portal Frontend Logic (Vanilla JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const navItems = document.querySelectorAll('.nav-item');
  const pageSections = document.querySelectorAll('.page-section');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  
  const refreshAllBtn = document.getElementById('refresh-all-btn');
  const presenceForm = document.getElementById('presence-form');
  const presenceStatusSelect = document.getElementById('presence-status');
  const presenceActivityInput = document.getElementById('presence-activity');
  
  const cornerBotAvatar = document.getElementById('corner-bot-avatar');
  const cornerBotName = document.getElementById('corner-bot-name');
  const cornerBotStatus = document.getElementById('corner-bot-status');
  
  const generalBotAvatar = document.getElementById('general-bot-avatar');
  const generalBotName = document.getElementById('general-bot-name');
  
  // Page titles and descriptions map
  const pageMetadata = {
    'page-overview': { title: 'Overview', desc: 'System summary, statistics, and application status.' },
    'page-general': { title: 'General Information', desc: 'Manage your bot application name, description, and avatar.' },
    'page-ai': { title: 'AI Configuration', desc: 'Manage Perspective API screening thresholds and safety keyword groups.' },
    'page-knowledge': { title: 'Counseling Knowledge Base', desc: 'Explore educational datasets matching Indian Class 12 college requirements.' },
    'page-oauth': { title: 'OAuth2 Generator', desc: 'Generate bot connection invite links with customized permission permissions.' },
    'page-permissions': { title: 'Permissions Hierarchy', desc: 'Configure staff moderator roles and developer overrides.' },
    'page-commands': { title: 'Slash Commands', desc: 'List and monitor active application commands registered on Discord.' },
    'page-integrations': { title: 'Integrations & Webhooks', desc: 'Manage external web service calls and deployment announcements webhooks.' },
    'page-analytics': { title: 'Analytics & Insights', desc: 'Visual graphs displaying student verification rates and warning frequency.' },
    'page-logs': { title: 'Console Logs Stream', desc: 'Inspect recent developer terminal logs and trace warnings.' },
    'page-settings': { title: 'Dashboard Settings', desc: 'Manage port configurations and secure HMAC webhook tokens.' }
  };

  // --- SPA Routing Router ---
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPageId = item.getAttribute('data-target');
      
      // Toggle nav items active state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Toggle page sections visibility
      pageSections.forEach(section => section.classList.remove('active'));
      const targetSection = document.getElementById(targetPageId);
      if (targetSection) {
        targetSection.classList.add('active');
      }
      
      // Update Title & Subtitle
      const meta = pageMetadata[targetPageId];
      if (meta) {
        pageTitle.textContent = meta.title;
        pageSubtitle.textContent = meta.desc;
      }
      
      // Trigger special page loading
      if (targetPageId === 'page-commands') fetchCommands();
      if (targetPageId === 'page-logs') fetchLogs();
    });
  });

  // Range input slider text helper
  const rangeSlider = document.getElementById('ai-toxicity-threshold');
  const rangeValue = document.getElementById('range-value');
  if (rangeSlider && rangeValue) {
    rangeSlider.addEventListener('input', (e) => {
      rangeValue.textContent = Number(e.target.value).toFixed(2);
    });
  }

  // Copy-on-click for snowflake elements
  document.querySelectorAll('.copyable').forEach(elem => {
    elem.addEventListener('click', () => {
      const text = elem.textContent.replace(' 📋', '').trim();
      navigator.clipboard.writeText(text).then(() => {
        const oldText = elem.innerHTML;
        elem.innerHTML = 'Copied! ✅';
        setTimeout(() => {
          elem.innerHTML = oldText;
        }, 1500);
      });
    });
  });

  // --- API Integrations ---

  // 1. Fetch Overview Statistics
  async function fetchStats() {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const stats = await res.json();
      
      document.getElementById('stat-warnings-total').textContent = stats.warnings?.total || 0;
      document.getElementById('stat-tickets-open').textContent = stats.tickets?.open || 0;
      document.getElementById('stat-suggestions-total').textContent = stats.suggestions?.total || 0;
      document.getElementById('stat-bugs-total').textContent = stats.bugs?.total || 0;
    } catch (err) {
      console.error(err);
    }
  }

  // 2. Fetch Bot Client Configurations
  async function fetchBotConfig() {
    try {
      const res = await fetch('/api/dashboard/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      const configData = await res.json();
      
      // Set sidebar avatar + name
      cornerBotAvatar.src = configData.avatar;
      cornerBotName.textContent = configData.name;
      
      // Set presence indicator dot color
      let dotColor = 'green';
      if (configData.status === 'idle') dotColor = 'yellow';
      if (configData.status === 'dnd') dotColor = 'red';
      if (configData.status === 'offline') dotColor = 'red';
      
      cornerBotStatus.innerHTML = `<span class="status-dot ${dotColor}"></span> ${configData.status}`;
      
      // Set general profile inputs
      generalBotAvatar.src = configData.avatar;
      generalBotName.textContent = configData.tag;
      
      // Set detail stats
      document.getElementById('info-guilds').textContent = configData.guilds;
      document.getElementById('info-users').textContent = configData.users;
      document.getElementById('info-ping').textContent = `${configData.ping}ms`;

      // Set form defaults
      presenceStatusSelect.value = configData.status === 'offline' ? 'online' : configData.status;
    } catch (err) {
      console.error(err);
    }
  }

  // 3. Update Bot Presence Form Handler
  presenceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = presenceStatusSelect.value;
    const activity = presenceActivityInput.value;
    
    try {
      const res = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, activity })
      });
      if (res.ok) {
        alert('Presence updated successfully! Check your Discord client.');
        fetchBotConfig();
      } else {
        const data = await res.json();
        alert(`Failed to update presence: ${data.error}`);
      }
    } catch (err) {
      alert(`Error updating presence: ${err.message}`);
    }
  });

  // 4. Fetch Slash Commands list
  async function fetchCommands() {
    const tableBody = document.getElementById('commands-table-body');
    tableBody.innerHTML = '<tr><td colspan="3" class="text-secondary text-center">Loading commands list...</td></tr>';
    
    try {
      const res = await fetch('/api/dashboard/commands');
      if (!res.ok) throw new Error('Failed to fetch commands');
      const data = await res.json();
      
      tableBody.innerHTML = '';
      if (!data.commands || data.commands.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-secondary text-center">No commands registered.</td></tr>';
        return;
      }
      
      data.commands.forEach(cmd => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>/${cmd.name}</strong></td>
          <td class="text-secondary">${cmd.description}</td>
          <td><span class="badge badge-success">Slash</span></td>
        `;
        tableBody.appendChild(row);
      });
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="3" class="text-secondary text-center" style="color: var(--color-red)">Failed to load commands: ${err.message}</td></tr>`;
    }
  }

  // 5. Fetch AI Configurations
  async function fetchAIConfig() {
    try {
      const res = await fetch('/api/dashboard/ai');
      if (!res.ok) throw new Error('Failed to fetch AI Config');
      const data = await res.json();
      
      const keyStatusText = data.keyConfigured 
        ? '🟢 Configured & Connected successfully (Perspective Analyzer active).' 
        : '⚠️ Perspective API Key is missing. Falling back to local safety keyword blacklist.';
      
      document.getElementById('ai-key-status').textContent = keyStatusText;
      
      // Load stress keywords
      const stressContainer = document.getElementById('ai-stress-keywords');
      stressContainer.innerHTML = '';
      data.stressFilters.forEach(kw => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = kw;
        stressContainer.appendChild(tag);
      });

      // Load spam keywords
      const spamContainer = document.getElementById('ai-spam-keywords');
      spamContainer.innerHTML = '';
      data.spamFilters.forEach(kw => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = kw;
        spamContainer.appendChild(tag);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // 6. Fetch Logs console data
  async function fetchLogs() {
    const consoleOutput = document.getElementById('log-console-output');
    
    try {
      const res = await fetch('/api/dashboard/logs');
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      
      consoleOutput.innerHTML = '';
      if (!data.logs || data.logs.length === 0) {
        consoleOutput.innerHTML = '<div class="log-entry text-secondary">[System] No terminal logs recorded yet.</div>';
        return;
      }
      
      data.logs.forEach(log => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        // Color logs based on log levels
        if (log.includes('INFO:')) entry.className += ' info';
        else if (log.includes('WARN:')) entry.className += ' warn';
        else if (log.includes('ERROR:')) entry.className += ' error';
        
        entry.textContent = log;
        consoleOutput.appendChild(entry);
      });
      
      // Scroll to bottom
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    } catch (err) {
      console.error(err);
    }
  }

  // Clear logs display DOM
  document.getElementById('clear-logs-btn').addEventListener('click', () => {
    document.getElementById('log-console-output').innerHTML = '<div class="log-entry text-secondary">[System] Console view cleared by developer.</div>';
  });

  // Copy OAuth invite link helper
  document.getElementById('copy-invite-btn').addEventListener('click', () => {
    const input = document.getElementById('invite-link-input');
    input.select();
    document.execCommand('copy');
    alert('Invite link copied to clipboard!');
  });

  // --- Initializers & Triggers ---
  function loadAllData() {
    fetchStats();
    fetchBotConfig();
    fetchAIConfig();
    fetchLogs();
  }

  // Boot startup loading
  loadAllData();

  // Manual refresh btn hook
  refreshAllBtn.addEventListener('click', () => {
    loadAllData();
    alert('Dashboard status and database metrics updated!');
  });

  // Live log polling every 4 seconds when looking at logs
  setInterval(() => {
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav && activeNav.getAttribute('data-target') === 'page-logs') {
      fetchLogs();
    }
  }, 4000);
});

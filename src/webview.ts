import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, nonce: string) {
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}`;

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <title>EditorConfig Editor</title>
            <style>
                body {
                    padding: 10px;
                }
                .section {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 3px;
                    margin-bottom: 10px;
                    padding: 10px;
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                }
                .section-header input {
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 4px 8px;
                    border-radius: 2px;
                    flex-grow: 1;
                }
                .property-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .property-name {
                    flex: 0 0 200px;
                    color: var(--vscode-foreground);
                }
                .property-value {
                    flex-grow: 1;
                }
                select, input {
                    width: 100%;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 4px 8px;
                    border-radius: 2px;
                }
                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 4px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                    margin-left: 8px;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .add-section {
                    margin-top: 16px;
                }
                .codicon {
                    font-family: codicon;
                    cursor: pointer;
                    font-size: 16px;
                    color: var(--vscode-icon-foreground);
                    padding: 4px;
                    border-radius: 3px;
                }
                .codicon:hover {
                    background-color: var(--vscode-toolbar-hoverBackground);
                }
                .delete-btn {
                    background: none;
                    border: none;
                    padding: 4px;
                    margin-left: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .delete-btn:hover {
                    background-color: var(--vscode-toolbar-hoverBackground);
                }
                @font-face {
                    font-family: "codicon";
                    src: url("${webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.ttf'))}") format("truetype");
                }
            </style>
        </head>
        <body>
            <div id="sections"></div>
            <button id="addSectionBtn" class="add-section">Add Section</button>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                let sections = [];

                // EditorConfig property options
                const propertyOptions = {
                    indent_style: ['space', 'tab'],
                    indent_size: 'number',
                    tab_width: 'number',
                    end_of_line: ['lf', 'cr', 'crlf'],
                    charset: ['utf-8', 'utf-8-bom', 'utf-16be', 'utf-16le', 'latin1'],
                    trim_trailing_whitespace: ['true', 'false'],
                    insert_final_newline: ['true', 'false'],
                    max_line_length: 'number',
                    custom: 'text'  // Special option that allows custom property names
                };

                function confirmDelete(message) {
                    return new Promise(resolve => {
                        vscode.postMessage({
                            type: 'confirm',
                            message: message
                        });

                        const handler = event => {
                            const message = event.data;
                            if (message.type === 'confirmResponse') {
                                window.removeEventListener('message', handler);
                                resolve(message.confirmed);
                            }
                        };
                        window.addEventListener('message', handler);
                    });
                }

                function createPropertyRow(name, value, parentElement, isCustom = false) {
                    const row = document.createElement('div');
                    row.className = 'property-row';
                    
                    if (isCustom) {
                        const nameInput = document.createElement('input');
                        nameInput.className = 'property-name';
                        nameInput.value = name || '';
                        nameInput.placeholder = 'Property name';
                        nameInput.style.width = '190px';
                        nameInput.addEventListener('change', updateDocument);
                        row.appendChild(nameInput);
                    } else {
                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'property-name';
                        nameSpan.textContent = name;
                        row.appendChild(nameSpan);
                    }
                    
                    const valueContainer = document.createElement('div');
                    valueContainer.className = 'property-value';
                    
                    if (!isCustom && Array.isArray(propertyOptions[name])) {
                        const select = document.createElement('select');
                        select.addEventListener('change', updateDocument);
                        propertyOptions[name].forEach(option => {
                            const opt = document.createElement('option');
                            opt.value = option;
                            opt.textContent = option;
                            opt.selected = option === value;
                            select.appendChild(opt);
                        });
                        valueContainer.appendChild(select);
                    } else {
                        const input = document.createElement('input');
                        input.type = (!isCustom && propertyOptions[name] === 'number') ? 'number' : 'text';
                        input.value = value || '';
                        input.addEventListener('change', updateDocument);
                        valueContainer.appendChild(input);
                    }
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'delete-btn';
                    removeBtn.innerHTML = '<i class="codicon codicon-trash"></i>';  // Using codicon class names instead of hex
                    removeBtn.title = 'Delete property';
                    removeBtn.addEventListener('click', async () => {
                        const propertyName = isCustom ? nameInput.value || 'this property' : name;
                        const confirmed = await confirmDelete(\`Are you sure you want to delete \${propertyName}?\`);
                        if (confirmed) {
                            row.remove();
                            updateDocument();
                        }
                    });
                    
                    row.appendChild(valueContainer);
                    row.appendChild(removeBtn);
                    parentElement.appendChild(row);
                }

                function addPropertyToSection(section) {
                    const propertySelect = document.createElement('select');
                    Object.keys(propertyOptions).forEach(prop => {
                        if (prop !== 'custom') {  // Don't show 'custom' in the dropdown
                            const option = document.createElement('option');
                            option.value = prop;
                            option.textContent = prop;
                            propertySelect.appendChild(option);
                        }
                    });
                    
                    const addKnownBtn = document.createElement('button');
                    addKnownBtn.textContent = 'Add Known Property';
                    addKnownBtn.addEventListener('click', () => {
                        const selectedProp = propertySelect.value;
                        createPropertyRow(selectedProp, '', section.querySelector('.section-properties'));
                        updateDocument();
                    });

                    const addCustomBtn = document.createElement('button');
                    addCustomBtn.textContent = 'Add Custom Property';
                    addCustomBtn.addEventListener('click', () => {
                        createPropertyRow('', '', section.querySelector('.section-properties'), true);
                        updateDocument();
                    });
                    
                    const container = document.createElement('div');
                    container.className = 'property-row';
                    container.style.gap = '8px';
                    container.appendChild(propertySelect);
                    container.appendChild(addKnownBtn);
                    container.appendChild(addCustomBtn);
                    section.appendChild(container);
                }

                function addSection(glob = '*') {
                    const section = document.createElement('div');
                    section.className = 'section';
                    
                    const header = document.createElement('div');
                    header.className = 'section-header';
                    
                    const globInput = document.createElement('input');
                    globInput.value = glob;
                    globInput.placeholder = 'File pattern (e.g., *.js)';
                    globInput.addEventListener('change', updateDocument);
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'delete-btn';
                    removeBtn.innerHTML = '<i class="codicon codicon-trash"></i>';  // Using codicon class names instead of hex
                    removeBtn.title = 'Delete section';
                    removeBtn.addEventListener('click', async () => {
                        const sectionName = globInput.value || 'this section';
                        const confirmed = await confirmDelete(\`Are you sure you want to delete \${sectionName}?\`);
                        if (confirmed) {
                            section.remove();
                            updateDocument();
                        }
                    });
                    
                    header.appendChild(globInput);
                    header.appendChild(removeBtn);
                    
                    const properties = document.createElement('div');
                    properties.className = 'section-properties';
                    
                    section.appendChild(header);
                    section.appendChild(properties);
                    
                    addPropertyToSection(section);
                    document.getElementById('sections').appendChild(section);
                }

                function updateDocument() {
                    let content = 'root = true\\n\\n';
                    
                    document.querySelectorAll('.section').forEach(section => {
                        const glob = section.querySelector('input').value;
                        content = content + '[' + glob + ']\\n';
                        
                        section.querySelectorAll('.property-row').forEach(row => {
                            const nameElement = row.querySelector('.property-name');
                            if (!nameElement) return;
                            
                            const valueElement = row.querySelector('select, input:not(.property-name)');
                            if (!valueElement) return;
                            
                            const name = nameElement.tagName === 'INPUT' ? nameElement.value : nameElement.textContent;
                            if (name && valueElement.value) {
                                content = content + name + ' = ' + valueElement.value + '\\n';
                            }
                        });
                        
                        content = content + '\\n';
                    });
                    
                    vscode.postMessage({
                        type: 'update',
                        content: content
                    });
                }

                // Set up event listeners after the DOM is loaded
                document.addEventListener('DOMContentLoaded', () => {
                    document.getElementById('addSectionBtn').addEventListener('click', () => addSection());
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'update':
                            // Clear existing sections
                            document.getElementById('sections').innerHTML = '';
                            
                            // Parse the content and create sections
                            const lines = message.content.split('\\n');
                            let currentSection = null;
                            
                            lines.forEach(line => {
                                line = line.trim();
                                if (!line || line === 'root = true') return;
                                
                                if (line.startsWith('[') && line.endsWith(']')) {
                                    const glob = line.slice(1, -1);
                                    addSection(glob);
                                    currentSection = document.querySelector('.section:last-child .section-properties');
                                } else if (currentSection && line.includes('=')) {
                                    const [name, value] = line.split('=').map(s => s.trim());
                                    // Check if this is a known property or should be treated as custom
                                    const isCustom = !(name in propertyOptions);
                                    createPropertyRow(name, value, currentSection, isCustom);
                                }
                            });
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
}
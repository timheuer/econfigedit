import * as vscode from 'vscode';
import * as path from 'path';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, nonce: string) {
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}`;
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'vscode-elements.css'));
    const codiconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

    console.log('Webview URIs:', { styleUri: styleUri.toString(), codiconUri: codiconUri.toString() });

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <title>EditorConfig Editor</title>
            <link rel="stylesheet" href="${styleUri}">
            <link rel="stylesheet" href="${codiconUri}">
            <style>
                body {
                    padding: 1rem;
                    line-height: 1.4;
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
                }

                .section {
                    margin-bottom: 1rem;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 2px;
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    background: var(--vscode-sideBarSectionHeader-background);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    cursor: pointer;
                    user-select: none;
                }

                .section-header:hover {
                    background: var(--vscode-sideBarSectionHeader-hoverBackground);
                }

                .section-header .collapse-icon {
                    font-family: codicon;
                    font-size: 16px;
                    line-height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--vscode-icon-foreground);
                    transition: transform 0.1s ease;
                }

                .section.collapsed .collapse-icon {
                    transform: rotate(-90deg);
                }

                .section.collapsed .section-content {
                    display: none;
                }

                .section-header-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex: 1;
                }

                .section-content {
                    padding: 0.5rem;
                }

                .property-row {
                    display: grid;
                    grid-template-columns: 200px 1fr auto;
                    gap: 0.5rem;
                    align-items: center;
                    min-height: 24px;
                    margin: 2px 0;
                }

                .property-controls {
                    display: grid;
                    grid-template-columns: 200px auto auto;
                    gap: 0.5rem;
                    align-items: center;
                    padding: 0.5rem;
                    background: var(--vscode-toolbar-activeBackground);
                    border-radius: 2px;
                    margin-top: 0.5rem;
                }

                input, select {
                    height: 24px;
                    min-width: 0;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                    padding: 0 6px;
                }

                input:focus, select:focus {
                    outline: 1px solid var(--vscode-focusBorder);
                    outline-offset: -1px;
                }

                .property-name {
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                }

                input.property-name {
                    width: 100%;
                }

                .property-value {
                    display: flex;
                    align-items: center;
                    flex: 1;
                }

                .property-value input,
                .property-value select,
                .section-header input {
                    width: 100%;
                }

                .delete-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    border: none;
                    background: none;
                    color: var(--vscode-icon-foreground);
                    cursor: pointer;
                    opacity: 0.8;
                    border-radius: 3px;
                }

                .delete-btn:hover {
                    opacity: 1;
                    background: var(--vscode-toolbar-hoverBackground);
                }

                .delete-btn .codicon {
                    font-size: 16px;
                }

                .actions-container {
                    margin-top: 1rem;
                }

                .vscode-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    padding: 2px 10px;
                    font-family: inherit;
                    font-size: inherit;
                    line-height: 1.4;
                    text-align: center;
                    cursor: pointer;
                    color: var(--vscode-button-foreground);
                    background: var(--vscode-button-background);
                    border-radius: 2px;
                }

                .vscode-button:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .vscode-button.secondary {
                    color: var(--vscode-button-secondaryForeground);
                    background: var(--vscode-button-secondaryBackground);
                }

                .vscode-button.secondary:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }

                .vscode-button .codicon {
                    font-family: codicon;
                    font-size: 16px;
                    line-height: 16px;
                    margin-right: 6px;
                }

                .section-properties:empty::before {
                    content: 'No properties defined';
                    display: block;
                    padding: 0.5rem;
                    font-style: italic;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div id="sections"></div>
            <div class="actions-container">
                <button id="addSectionBtn" class="vscode-button">
                    <i class="codicon codicon-add"></i>
                    Add Section
                </button>
            </div>

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
                    custom: 'text'
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
                    let rowHasFocus = false;
                    
                    let nameInput;
                    if (isCustom) {
                        nameInput = document.createElement('input');
                        nameInput.className = 'property-name';
                        nameInput.type = 'text';
                        nameInput.value = name || '';
                        nameInput.placeholder = 'Property name';
                        nameInput.addEventListener('focus', () => rowHasFocus = true);
                        nameInput.addEventListener('blur', () => {
                            rowHasFocus = false;
                            // Give other elements in the row a chance to get focus
                            setTimeout(() => {
                                if (!rowHasFocus) {
                                    updateDocument();
                                }
                            }, 100);
                        });
                        row.appendChild(nameInput);
                    } else {
                        const nameSpan = document.createElement('div');
                        nameSpan.className = 'property-name';
                        nameSpan.textContent = name;
                        row.appendChild(nameSpan);
                    }
                    
                    const valueContainer = document.createElement('div');
                    valueContainer.className = 'property-value';
                    
                    if (isCustom || !propertyOptions[name]) {
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = value || '';
                        input.addEventListener('focus', () => rowHasFocus = true);
                        input.addEventListener('blur', () => {
                            rowHasFocus = false;
                            // Give other elements in the row a chance to get focus
                            setTimeout(() => {
                                if (!rowHasFocus) {
                                    updateDocument();
                                }
                            }, 100);
                        });
                        valueContainer.appendChild(input);
                    } else if (Array.isArray(propertyOptions[name])) {
                        const select = document.createElement('select');
                        select.addEventListener('focus', () => rowHasFocus = true);
                        select.addEventListener('blur', () => {
                            rowHasFocus = false;
                            // Give other elements in the row a chance to get focus
                            setTimeout(() => {
                                if (!rowHasFocus) {
                                    updateDocument();
                                }
                            }, 100);
                        });
                        // Update immediately on change for dropdowns
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
                        input.type = propertyOptions[name] === 'number' ? 'number' : 'text';
                        input.value = value || '';
                        input.addEventListener('focus', () => rowHasFocus = true);
                        input.addEventListener('blur', () => {
                            rowHasFocus = false;
                            // Give other elements in the row a chance to get focus
                            setTimeout(() => {
                                if (!rowHasFocus) {
                                    updateDocument();
                                }
                            }, 100);
                        });
                        valueContainer.appendChild(input);
                    }
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'delete-btn';
                    removeBtn.innerHTML = '<i class="codicon codicon-trash"></i>';
                    removeBtn.title = 'Delete property';
                    removeBtn.addEventListener('click', async () => {
                        const propertyName = isCustom ? (nameInput?.value || 'this property') : name;
                        const confirmed = await confirmDelete(\`Are you sure you want to delete \${propertyName}?\`);
                        if (confirmed) {
                            row.remove();
                            updateDocument();
                        }
                    });
                    
                    row.appendChild(valueContainer);
                    row.appendChild(removeBtn);
                    parentElement.appendChild(row);

                    return row;
                }

                function addPropertyToSection(section) {
                    const controls = document.createElement('div');
                    controls.className = 'property-controls';

                    const propertySelect = document.createElement('select');
                    Object.keys(propertyOptions).forEach(prop => {
                        if (prop !== 'custom') {
                            const option = document.createElement('option');
                            option.value = prop;
                            option.textContent = prop;
                            propertySelect.appendChild(option);
                        }
                    });
                    
                    const addKnownBtn = document.createElement('button');
                    addKnownBtn.className = 'vscode-button';
                    addKnownBtn.innerHTML = '<i class="codicon codicon-symbol-property"></i>Add Known';
                    addKnownBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const selectedProp = propertySelect.value;
                        const propertiesContainer = section.querySelector('.section-properties');
                        const existingProps = Array.from(propertiesContainer.querySelectorAll('.property-name')).filter(el => !el.tagName.toLowerCase().includes('input'));
                        const exists = existingProps.some(prop => prop.textContent === selectedProp);
                        
                        if (exists) {
                            vscode.postMessage({
                                type: 'okcancel',
                                message: 'Property "' + selectedProp + '" already exists in this section.'
                            });
                            return;
                        }
                        
                        const row = createPropertyRow(selectedProp, '', propertiesContainer);
                        
                        requestAnimationFrame(() => {
                            const valueElement = row.querySelector('select, input:not(.property-name)');
                            if (valueElement) {
                                valueElement.focus();
                                if (valueElement.tagName.toLowerCase() === 'select') {
                                    valueElement.click();
                                }
                            }
                        });
                    });

                    const addCustomBtn = document.createElement('button');
                    addCustomBtn.className = 'vscode-button secondary';
                    addCustomBtn.innerHTML = '<i class="codicon codicon-edit"></i>Add Custom';
                    addCustomBtn.addEventListener('click', () => {
                        const row = createPropertyRow('', '', section.querySelector('.section-properties'), true);
                        row.querySelector('.property-name').focus();
                    });
                    
                    controls.appendChild(propertySelect);
                    controls.appendChild(addKnownBtn);
                    controls.appendChild(addCustomBtn);

                    const content = section.querySelector('.section-content');
                    content.appendChild(controls);
                }

                function addSection(glob = '*') {
                    const section = document.createElement('div');
                    section.className = 'section';
                    
                    const header = document.createElement('div');
                    header.className = 'section-header';

                    const collapseIcon = document.createElement('i');
                    collapseIcon.className = 'collapse-icon codicon codicon-chevron-down';
                    
                    const headerContent = document.createElement('div');
                    headerContent.className = 'section-header-content';
                    
                    const globInput = document.createElement('input');
                    globInput.value = glob;
                    globInput.placeholder = 'File pattern (e.g., *.js)';
                    
                    // Only prevent event bubbling
                    globInput.addEventListener('click', e => {
                        e.stopPropagation();
                    });
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'delete-btn';
                    removeBtn.innerHTML = '<i class="codicon codicon-trash"></i>';
                    removeBtn.title = 'Delete section';
                    removeBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const sectionName = globInput.value || 'this section';
                        const confirmed = await confirmDelete(\`Are you sure you want to delete \${sectionName}?\`);
                        if (confirmed) {
                            section.remove();
                            updateDocument();
                        }
                    });
                    
                    headerContent.appendChild(globInput);
                    headerContent.appendChild(removeBtn);
                    
                    header.appendChild(collapseIcon);
                    header.appendChild(headerContent);

                    header.addEventListener('click', () => {
                        section.classList.toggle('collapsed');
                    });
                    
                    const properties = document.createElement('div');
                    properties.className = 'section-properties';

                    const content = document.createElement('div');
                    content.className = 'section-content';
                    content.appendChild(properties);
                    
                    section.appendChild(header);
                    section.appendChild(content);
                    
                    addPropertyToSection(section);
                    document.getElementById('sections').appendChild(section);

                    return section;
                }

                function updateDocument() {
                    if (updateDocument.timeout) {
                        clearTimeout(updateDocument.timeout);
                    }
                    
                    updateDocument.timeout = setTimeout(() => {
                        let content = 'root = true\\n\\n';
                        
                        document.querySelectorAll('.section').forEach(section => {
                            const glob = section.querySelector('input').value;
                            if (!glob) return;
                            
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
                        
                        updateDocument.timeout = null;
                    }, 300);
                }

                document.addEventListener('DOMContentLoaded', () => {
                    console.log('Webview DOM loaded');
                    document.getElementById('addSectionBtn').addEventListener('click', () => addSection());
                });

                console.log('Webview script loaded');

                window.addEventListener('message', event => {
                    console.log('Received message in webview:', event.data.type);
                    const message = event.data;
                    switch (message.type) {
                        case 'update':
                            document.getElementById('sections').innerHTML = '';
                            
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
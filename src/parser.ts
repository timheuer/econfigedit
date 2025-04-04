export interface EditorConfigSection {
    glob: string;
    properties: Record<string, string>;
}

export function parseEditorConfig(content: string): EditorConfigSection[] {
    const sections: EditorConfigSection[] = [];
    let currentSection: EditorConfigSection | null = null;
    
    const lines = content.split(/\r?\n/);
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
            continue;
        }
        
        // Skip root declaration
        if (trimmedLine === 'root = true') {
            continue;
        }
        
        // Check for section header
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            const glob = trimmedLine.slice(1, -1);
            currentSection = { glob, properties: {} };
            sections.push(currentSection);
            continue;
        }
        
        // Parse property
        if (currentSection && trimmedLine.includes('=')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            const value = valueParts.join('=').trim();
            currentSection.properties[key.trim()] = value;
        }
    }
    
    return sections;
}

export function stringifyEditorConfig(sections: EditorConfigSection[]): string {
    let content = 'root = true\n\n';
    
    for (const section of sections) {
        content += `[${section.glob}]\n`;
        for (const [key, value] of Object.entries(section.properties)) {
            content += `${key} = ${value}\n`;
        }
        content += '\n';
    }
    
    return content;
}
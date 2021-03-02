<script lang="ts">
    import { onMount } from "svelte";

    let projects: Array<{ name: string; path: string }> = [];
    let text = "";
    let defaultLocation: string = tsvscode.getState()?.defaultLocation ?? savedDefaultLocation;
    if(!defaultLocation.endsWith('\\')) {
        defaultLocation += '\\';
    }
    let search = '';

    $: {
        tsvscode.setState({defaultLocation});
    }

    onMount(() => {
        tsvscode.postMessage({
            command: 'init',
            value: defaultLocation,
        });
        window.addEventListener("message", (e) => {
            const message: { command: string; value: any } = e.data;
            switch (message.command) {
                case "add-project": {
                    addProject(message.value);
                    break;
                }
                case 'giveFolder': {
                    defaultLocation = message.value + '\\';
                    projects = [];
                }
            }
        });
    });

    const createProject = () => {
        if(text === '') return;
        const newValue = text.replace(/\//g, '\\').substring(text.replace(/\//g, '\\').lastIndexOf("\\") + 1);
        for(let i = 0; i < projects.length; i++) {
            if(projects[i].name === newValue) return;
        }
        addProject(defaultLocation + text);
        tsvscode.postMessage({
            command: 'create-project',
            value: projects[0]
        });
    }

    const addProject = (value: string) => {
        const newValue = value.replace(/\//g, '\\').substring(value.replace(/\//g, '\\').lastIndexOf("\\") + 1);
        for(let i = 0; i < projects.length; i++) {
            if(projects[i].name === newValue) return;
        }
        projects = [{ name: newValue, path: value }, ...projects];
    };

    const pickFolder = () => {
        tsvscode.postMessage({
            command: 'askFolder',
            value: '',
        });
    }
</script>

<form
    on:submit|preventDefault={() => {
        createProject();
        text = "";
    }}
>
    <input name='project-name' placeholder='Name of new project' bind:value={text} />
    <div class='locationBox'>
        <input id='location' readonly value={defaultLocation + text}/>
        <button type='button' on:click={pickFolder} id='pick'>Folder</button>
    </div>
    <button type='submit'>Create project</button>
</form>
<input bind:value={search} placeholder='Search in projects'/>
<div class='project-container'>
    {#each projects as project (project.name)}
        {#if project.name.includes(search)}
            <div class='project' on:click={() => tsvscode.postMessage({
                command: 'create-project',
                value: project
            })}>
                <div class='project-name'>{project.name}</div>
                <div class='project-path'>{project.path}</div>
            </div>
        {/if}
    {/each}
</div>

<style>

    .locationBox {
        display: flex;
        flex-direction: row;
    }
    .project {
        padding: 2px;
        display: grid;
        grid-template-columns: 1fr auto;
    }
    .project:hover {
        cursor: pointer;
        background-color: rgba(255, 255, 255, 0.1);
    }
    .project-path {
        margin-inline-start: 4px;
        margin-inline-end: 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
          /* Beginning of string */
        direction: rtl;
        text-align: left;
    }
    .project-name {
        font-weight: bold;
        white-space: nowrap;
    }

    #location {
        flex: 75%;
    }
    #pick {
        flex: 25%
    }
</style>

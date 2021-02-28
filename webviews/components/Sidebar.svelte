<script lang="ts">
    import { onMount } from "svelte";

    let projects: Array<{ text: string; completed: boolean }> = [];
    let text = "";

    onMount(() => {
        window.addEventListener("message", (e) => {
            const message: { command: string; value: any } = e.data;
            switch (message.command) {
                case "add-project": {
                    addProject(message.value);
                    break;
                }
            }
        });
    });

    const addProject = (value: string) => {
        for(let i = 0; i < projects.length; i++) {
            if(projects[i].text === value) return;
        }
        projects = [{ text: value, completed: false }, ...projects];
    };
</script>

<form
    on:submit|preventDefault={() => {
        addProject(text);
        text = "";
    }}
>
    <input bind:value={text} />
</form>

<ul>
    {#each projects as project (project.text)}
        <li
            class:complete={project.completed}
            on:click={() => {
                project.completed = !project.completed;
            }}
        >
            {project.text}
        </li>
    {/each}
</ul>

<button
    on:click={() => {
        tsvscode.postMessage({
            command: "onInfo",
            value: "info message",
        });
    }}>click me</button
>

<button
    on:click={() => {
        tsvscode.postMessage({
            command: "onError",
            value: "nice error bro",
        });
    }}>free error</button
>

<style>
    .complete {
        text-decoration: line-through;
    }
</style>

class StrontiumTpl {
    constructor() {
        this.srcContent = '';
        this.resultContent = '';
        this.open = open;
    }

    openTpl(srcContent) {
        this.srcContent = srcContent;
        this.resultContent = srcContent;
        var matches = 0;
        var reg = new RegExp();

        var rc = this.resultContent.search(/<!--[ ]+START[ ]+BLOCK[ ]+:[ ]+([a-z0-9_]+)[ ]+-->/);
        if (rc != -1) {
            while (matches = this.resultContent.match(/<!--[ ]+START[ ]+BLOCK[ ]+:[ ]+([a-z0-9_]+)[ ]+-->/)) {
                reg.compile("<!--[ ]+START[ ]+BLOCK[ ]+:[ ]+" + matches[1] + "[ ]+-->([\\s\\S]*)<!--[ ]+END[ ]+BLOCK[ ]+:[ ]+" + matches[1] + "[ ]+-->");
                this.resultContent =    this.resultContent.replace(reg, '<<-' + matches[1] + '->>');
             }
        }
    }

    assign(blockName, data) {
        var reg = new RegExp();
        var matches;
        var content;

        if (blockName) {
            reg.compile("<!--[ ]+START[ ]+BLOCK[ ]+:[ ]+" + blockName + "[ ]+-->([\\s\\S]*)<!--[ ]+END[ ]+BLOCK[ ]+:[ ]+" + blockName + "[ ]+-->");
            matches = this.srcContent.match(reg);
            content = matches[1];
        } else
            content = this.srcContent;

        while (matches = content.match(/<!--[ ]+START[ ]+BLOCK[ ]+:[ ]+([a-z0-9_]+)[ ]+-->/)) {
            reg.compile("<!--[ ]+START[ ]+BLOCK[ ]+:[ ]+" + matches[1] + "[ ]+-->([\\s\\S]*)<!--[ ]+END[ ]+BLOCK[ ]+:[ ]+" + matches[1] + "[ ]+-->");
            content = content.replace(reg, '<<-' + matches[1] + '->>');
            reg.compile('<<-' + matches[1] + '->>');
            this.resultContent = this.resultContent.replace(reg, '');
        }

        if (data) {
            for(var mark in data)
                content = content.replaceAll('{' + mark + '}', data[mark]);
        }

        if (blockName) {
            reg.compile('<<-' + blockName + '->>');
            this.resultContent = this.resultContent.replace(reg, content + '<<-' + blockName + '->>');
        } else
            this.resultContent = content;
    }

    result() {
        this.resultContent = this.resultContent.replace(/[\\s\\S]*(<<-.*->>)[\\s\\S]*/g, "");
        this.resultContent = this.resultContent.replace(/[\\s\\S]*({\w+})[\\s\\S]*/g, "");
        return this.resultContent;
    }

}




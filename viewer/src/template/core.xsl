<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:hx="http://hxdoc.org/schemas/hxdoc-0.1.xsd"
    version="1.0">
    
    <xsl:output method="html" />    
    
    <!-- case conversion helpers -->
    
    <xsl:variable name="uppercase" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'" />
    <xsl:variable name="lowercase" select="'abcdefghijklmnopqrstuvwxyz'" />
    
    <xsl:template name="initialCaps">
        <xsl:param name="value" select="''" />
        <xsl:value-of select=
            "concat(
            substring(translate($value, $lowercase, $uppercase), 1, 1), 
            substring(translate($value, $uppercase, $lowercase), 2)
            )"/>
    </xsl:template>
    
    <!-- main template -->
    
    <xsl:template match="/hx:package">
        
        <div>
            
            <xsl:attribute name="class">
                <xsl:text>hxdoc </xsl:text>
                <xsl:value-of select="translate(hx:language, $uppercase, $lowercase)"/>
            </xsl:attribute>
        
            <div class="home">
            
                <div class="masthead">
                    <xsl:for-each select="hx:name|hx:version|hx:language">
                        <xsl:apply-templates select="." mode="home"/>
                    </xsl:for-each>
                </div>
                
                <div class="vitals">
                
                    <xsl:for-each select=
                        "hx:author
                        |hx:copyright
                        |hx:license
                        |hx:websites">
                        <xsl:apply-templates select="." mode="home"/>
                    </xsl:for-each>
                    
                </div>
                
                <div class="summary"><xsl:value-of select="hx:summary"/></div>
                
                <xsl:for-each select="hx:details">
                    <div class="details">
                        <xsl:call-template name="markUp"/>    
                    </div>
                </xsl:for-each>
                
                <xsl:call-template name="memberTables"/>
                
            </div>
            
            <div class="contents">
                <xsl:call-template name="contentsList"/>
            </div>
            
            <div class="pages">
                <xsl:variable name="members" select=
                    "//hx:constant
                    |//hx:variable
                    |//hx:method
                    |//hx:event
                    |//hx:class
                    |//hx:namespace" />
                <xsl:for-each select="$members">
                    <xsl:call-template name="page"/>
                </xsl:for-each>
            </div>
        </div>
    </xsl:template>
    
    
    <!-- home page templates -->
    
    <xsl:template match="hx:name" mode="home">
        <h1><xsl:value-of select="."/></h1>
    </xsl:template>
    
    <xsl:template match="hx:version" mode="home">
        <div class="version">Version 
            <span class="value"><xsl:value-of select="."/></span>
        </div>
    </xsl:template>
    
    <xsl:template match="hx:author" mode="home">
        <div class="author">Written by
            <span class="value"><xsl:value-of select="."/></span>
        </div>
    </xsl:template>
    
    <xsl:template match="hx:copyright|hx:license" mode="home">
        <div>
            <xsl:attribute name="class">
                <xsl:value-of select="local-name()"/>
            </xsl:attribute>
            <xsl:value-of select="."/>
        </div>
    </xsl:template>
    
    <xsl:template match="hx:websites" mode="home">
        <dl class="websites">
            <xsl:apply-templates select="hx:website" mode="home"/>
        </dl>
    </xsl:template>
    
    <xsl:template match="hx:website" mode="home">
        <dt><xsl:value-of select="hx:name"/>:</dt>
        <dd>
            <a>
                <xsl:attribute name="href">
                    <xsl:value-of select="hx:url"/>
                </xsl:attribute>
                <xsl:attribute name="title">
                    <xsl:value-of select="ancestor::hx:package/hx:name"/>
                    <xsl:text> - </xsl:text>
                    <xsl:value-of select="hx:name"/>
                </xsl:attribute>
                <xsl:value-of select="hx:url"/>
            </a>
        </dd>
    </xsl:template>
    
    <xsl:template match="hx:language" mode="home">
        <span class="language">
            <xsl:call-template name="nicerLanguageName"/>
        </span>
    </xsl:template>
    
    
    
    
    
    
    <!-- functions (if we can call them that!) -->
    
    <xsl:template name="baseIds">
        <xsl:variable name="baseId" select="hx:base//hx:internal"/>
        <xsl:for-each select="//*[@id = $baseId]">
            <xsl:value-of select="concat('#', @id)"/>
            <xsl:call-template name="baseIds"/>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="nicerLanguageName">
        <xsl:param name="language" select="." />
        <xsl:choose>
            <xsl:when test="$language = 'BASH'">BASH Script</xsl:when>
            <xsl:when test="$language = 'CSharp'">C#</xsl:when>
            <xsl:when test="$language = 'VisualBasic'">Visual Basic</xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$language"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template name="memberId">
        <xsl:param name="ignoreFirstOverload" select="false()"/>
        <xsl:choose>
            <xsl:when test="local-name() = 'overload'">
                <xsl:variable name="thisOverload" select="."/>
                    <xsl:for-each select="..">
                    <xsl:call-template name="memberId"/>
                    <xsl:for-each select="hx:overload">
                        <xsl:if test=". = $thisOverload and (position() != 1 or not($ignoreFirstOverload))">
                            <xsl:value-of select="concat('-', position())"/>
                        </xsl:if>
                    </xsl:for-each>
                </xsl:for-each>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>!/members/</xsl:text>
                <xsl:for-each select="ancestor-or-self::node()">
                    <xsl:if test="local-name() != 'package' and hx:name">
                        
                        <!-- disambiguation variables -->
                        <xsl:variable name="memberName" select="hx:name" />
                        <xsl:variable name="groupName" select="local-name(..)" />
                        
                        <!-- instance/static disambiguation -->
                        <xsl:if test="count(../parent::node()[local-name() = 'instance' or local-name() = 'static']/../*/*[local-name() = $groupName]/*[hx:name = $memberName]) &gt; 1">
                            <!-- used parent::node() instead of .. because oxygen has a problem with it. no idea why. -->
                            <xsl:value-of select="concat(local-name(../..), '-')"/>
                        </xsl:if>
                        
                        <!-- member type disambiguation -->
                        <xsl:if test="count(../../*/*[hx:name = $memberName]) &gt; 1">
                            <xsl:value-of select="concat(local-name(), '-')"/>
                        </xsl:if>
                        
                        <!-- member name -->
                        <xsl:value-of select="$memberName"/>
                        
                        <!-- separator -->
                        <xsl:if test="position() != last()">
                            <xsl:text>/</xsl:text>
                        </xsl:if>
                        
                    </xsl:if>
                </xsl:for-each>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template name="memberNameWithParent">
        <xsl:param name="member" select="."/>
        <xsl:variable name="parentMember" select="$member/ancestor::*[hx:name][1]"/>
        <xsl:if test="local-name($parentMember) != 'package'">
            <span class="parent">
                <xsl:value-of select="$parentMember/hx:name"/>
            </span>
        </xsl:if>
        <span class="name">
            <xsl:value-of select="$member/hx:name"/>
        </span>
    </xsl:template>
    
    <xsl:template name="memberHref">
        <xsl:param name="member" select="."/>
        <xsl:attribute name="href">
            <xsl:text>#</xsl:text>
            <xsl:for-each select="$member">
                <xsl:call-template name="memberId">
                    <xsl:with-param name="ignoreFirstOverload" select="true()"/>
                </xsl:call-template>
            </xsl:for-each>
        </xsl:attribute>
    </xsl:template>
    
    <xsl:template name="memberClassesInitCaps">
        <xsl:if test="hx:access">
            <xsl:call-template name="initialCaps">
                <xsl:with-param name="value">
                    <xsl:value-of select="hx:access"/>
                </xsl:with-param>
            </xsl:call-template>
            <xsl:text> </xsl:text>
        </xsl:if>
        <xsl:if test="local-name(../..) = 'static' or local-name(../..) = 'instance'">
            <xsl:call-template name="initialCaps">
                <xsl:with-param name="value">
                    <xsl:value-of select="local-name(../..)"/>
                </xsl:with-param>
            </xsl:call-template>
            <xsl:text> </xsl:text>
        </xsl:if>
        <xsl:call-template name="initialCaps">
            <xsl:with-param name="value">
                <xsl:value-of select="local-name()"/>
            </xsl:with-param>
        </xsl:call-template>
    </xsl:template>
    
    <xsl:template name="memberClasses">
        <xsl:variable name="returnValue">
            <xsl:call-template name="memberClassesInitCaps"/>
        </xsl:variable>
        <xsl:value-of select="translate($returnValue, $uppercase, $lowercase)"/>
    </xsl:template>
    
    <xsl:template name="typeList">
        <xsl:param name="typeSet" select="."/>
        <xsl:param name="noLinks" select="false()"/>
        <xsl:for-each select="$typeSet/*">
            <li>
                <xsl:attribute name="class">
                    <xsl:value-of select="local-name()"/>
                </xsl:attribute>
                <xsl:choose>
                    <xsl:when test="local-name() = 'type'">
                        <xsl:value-of select="."/>
                    </xsl:when>
                    <xsl:when test="$noLinks">
                        <xsl:value-of select="*"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:call-template name="link"/>
                    </xsl:otherwise>
                </xsl:choose>
            </li>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="link">
        <xsl:param name="includeParent" select="false()"/>
        <xsl:choose>
            <xsl:when test="local-name() = 'link'">
                <a>
                    <xsl:attribute name="class">
                        <xsl:value-of select="local-name(*)"/>
                    </xsl:attribute>
                    <xsl:variable name="internalId" select="hx:internal"/>
                    <xsl:for-each select="//*[@id = $internalId]">
                        <xsl:call-template name="memberHref"/>
                        <xsl:choose>
                            <xsl:when test="$includeParent">
                                <xsl:call-template name="memberNameWithParent"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:value-of select="hx:name"/>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:for-each>
                    <xsl:for-each select="hx:external">
                        <xsl:attribute name="href">
                            <xsl:value-of select="@href"/>
                        </xsl:attribute>
                        <xsl:value-of select="."/>
                    </xsl:for-each>
                </a>
            </xsl:when>
            <xsl:otherwise>
                <xsl:for-each select=".//hx:link">
                    <xsl:call-template name="link">
                        <xsl:with-param name="includeParent" select="$includeParent"/>
                    </xsl:call-template>
                </xsl:for-each>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template name="argumentsList">
        <xsl:param name="member" select="."/>
        <xsl:param name="noLinks" select="false()"/>
        <xsl:choose>
            <xsl:when test="$member/hx:link">
                <xsl:variable name="internal" select="$member/hx:link/hx:internal"/>
                <xsl:call-template name="argumentsList">
                    <xsl:with-param name="noLinks" select="$noLinks"/>
                    <xsl:with-param name="member" select="//*[@id = $internal]"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="args" select="($member|$member/hx:overload[1])/*/hx:argument"/>
                <ul>
                    <xsl:attribute name="class">
                        <xsl:text>arguments </xsl:text>
                        <xsl:choose>
                            <xsl:when test="count($args) = 0">none</xsl:when>
                            <xsl:when test="count($args) = 1">single</xsl:when>
                            <xsl:otherwise>multiple</xsl:otherwise>
                        </xsl:choose>
                    </xsl:attribute>
                    <xsl:for-each select="$args">
                        <li>
                            <xsl:attribute name="class">
                                <xsl:choose>
                                    <xsl:when test="hx:optional">optional</xsl:when>
                                    <xsl:otherwise>required</xsl:otherwise>
                                </xsl:choose>
                            </xsl:attribute>
                            <ul class="types">
                                <xsl:call-template name="typeList">
                                    <xsl:with-param name="typeSet" select="hx:types"/>
                                    <xsl:with-param name="noLinks" select="$noLinks"/>
                                </xsl:call-template>
                            </ul>
                            <span class="name"><xsl:value-of select="hx:name"/></span>
                        </li>
                    </xsl:for-each>
                </ul>
            </xsl:otherwise>
        </xsl:choose>
        
    </xsl:template>
    
    <xsl:template name="methodOrOverload">
        <xsl:param name="overload" select="."/>
        <xsl:choose>
            <xsl:when test="count(../hx:overload) = 1">method</xsl:when>
            <xsl:otherwise>overload</xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    
    
    
    
    
    
    <!-- markup rendering -->
    
    <xsl:template name="markUp">
        <xsl:apply-templates select="*" mode="markUp" />
    </xsl:template>
    
    <xsl:template match="hx:paragraph" mode="markUp">
        <p>
            <xsl:apply-templates select="*|node()" mode="markUp"/>
        </p>
    </xsl:template>
    
    <xsl:template match="hx:heading" mode="markUp">
        <h4><xsl:value-of select="."/></h4>
    </xsl:template>
    
    <xsl:template match="hx:strong|hx:code" mode="markUp">
        <xsl:element name="{local-name()}" >
            <xsl:if test="@language">
                <span class="language">
                    <xsl:call-template name="nicerLanguageName">
                        <xsl:with-param name="language" select="@language"/>
                    </xsl:call-template>
                </span>
            </xsl:if>
            <xsl:value-of select="."/>
        </xsl:element>
    </xsl:template>
    
    <xsl:template match="hx:link" mode="markUp">
       <xsl:call-template name="link"/>
    </xsl:template>
    
    <xsl:template match="hx:list" mode="markUp">
        <xsl:variable name="listElement">
            <xsl:choose>
                <xsl:when test="@type = 'ordered'">ol</xsl:when>
                <xsl:otherwise>ul</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:element name="{$listElement}">
            <xsl:apply-templates select="*|node()" mode="markUp"/>
        </xsl:element>
    </xsl:template>
    
    <xsl:template match="hx:item" mode="markUp">
        <li><xsl:apply-templates select="*|node()" mode="markUp"/></li>
    </xsl:template>
    
    
    
    
    
    <!-- contents -->
    
    <xsl:template name="contentsList">
        <xsl:param name="level" select="1" />
        <xsl:variable name="members" select=
            "(*|*/*)/hx:constant
            |(*|*/*)/hx:variable
            |(*|*/*)/hx:method
            |(*|*/*)/hx:event
            |(*|*/*)/hx:class
            |(*|*/*)/hx:namespace"/>
        <xsl:if test="count($members) != 0">
            <ul>
                <xsl:attribute name="class">
                    <xsl:text>members level</xsl:text>
                    <xsl:value-of select="$level"/>
                </xsl:attribute>
                
                <xsl:for-each select="$members">
                    <!--<xsl:sort select="local-name()"/>-->
                    <xsl:sort select="hx:name"/>
                    <xsl:call-template name="contentsItem">
                        <xsl:with-param name="level" select="$level"/>
                    </xsl:call-template>
                </xsl:for-each>
            </ul>
        </xsl:if>
    </xsl:template>
    
    <xsl:template name="contentsItem">
        <xsl:param name="level" select="1" />
        <li>
            <xsl:attribute name="class">
                <xsl:call-template name="memberClasses"/>    
            </xsl:attribute>
            <a class="name">
                <xsl:call-template name="memberHref"/>
                <xsl:value-of select="hx:name"/>
                <xsl:if test="local-name() = 'method' or local-name() = 'event'">
                    <xsl:call-template name="argumentsList">
                        <xsl:with-param name="noLinks" select="true()"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:if test="local-name() = 'method' and hx:overload[1]/hx:returns">
                    <ul class="returns">
                        <xsl:call-template name="typeList">
                            <xsl:with-param name="typeSet" select="hx:overload[1]/hx:returns/hx:types"/>
                            <xsl:with-param name="noLinks" select="true()"/>
                        </xsl:call-template>
                    </ul>
                </xsl:if>
            </a>
            <xsl:call-template name="contentsList">
                <xsl:with-param name="level" select="$level + 1"/>
            </xsl:call-template>
        </li>
    </xsl:template>
    
    
    
    
    
    
    
    
    <!-- pages -->
    
    <xsl:template name="page">
        <div>
            
            <!-- attributes -->
            
            <xsl:attribute name="class">
                <xsl:call-template name="memberClasses"/>
                <xsl:text> page</xsl:text>
            </xsl:attribute>
            <xsl:attribute name="id">
                <xsl:call-template name="memberId"/>
            </xsl:attribute>
            
            <xsl:call-template name="breadcrumb"/>
            
            <!-- for the rest, apply to self, or overloads if it's a method -->
            <xsl:choose>
                <xsl:when test="hx:overload">
                    <div>
                    <xsl:attribute name="class">
                        <xsl:text>overloads </xsl:text>
                        <xsl:choose>
                            <xsl:when test="count(hx:overload) = 1">single</xsl:when>
                            <xsl:otherwise>multiple</xsl:otherwise>
                        </xsl:choose>
                    </xsl:attribute>
                    
                        <xsl:call-template name="overloads"/>
                    
                    </div>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:call-template name="pageContents"/>
                </xsl:otherwise>
            </xsl:choose>
            
        </div>
    </xsl:template>
    
    <xsl:template name="overloads">
        <xsl:variable name="overloads" select="hx:overload" />
        <xsl:for-each select="$overloads">
            <div class="overload">
                <xsl:attribute name="id">
                    <xsl:call-template name="memberId"/>
                </xsl:attribute>
                <!-- overload index -->
                <xsl:if test="count($overloads) &gt; 1">
                    <div class="overloadIndex">
                        Overload
                        <span class="index"><xsl:value-of select="position()"/></span>
                        of
                        <span class="count"><xsl:value-of select="count($overloads)"/></span>
                    </div>
                </xsl:if>
                <xsl:call-template name="pageContents">
                    <xsl:with-param name="memberNode" select=".." />
                </xsl:call-template>
            </div>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="breadcrumb">
        <ul class="breadcrumb">
            <xsl:for-each select="ancestor-or-self::*[hx:name]">
                <li>
                    <xsl:attribute name="class">
                        <xsl:choose>
                            <xsl:when test="position() = 1">home</xsl:when>
                            <xsl:otherwise>
                                <xsl:call-template name="memberClasses"></xsl:call-template>
                            </xsl:otherwise>
                        </xsl:choose>
                        <xsl:if test="position() = last()">
                            <xsl:text> active</xsl:text>
                        </xsl:if>
                    </xsl:attribute>
                    <a>
                        <xsl:attribute name="href">
                            <xsl:text>#</xsl:text>
                            <xsl:choose>
                                <xsl:when test="position() = 1"/>
                                <xsl:otherwise>
                                    <xsl:call-template name="memberId"></xsl:call-template>
                                </xsl:otherwise>
                            </xsl:choose>
                        </xsl:attribute>
                        <xsl:value-of select="hx:name"/>
                    </a>
                </li>
                <!--<xsl:if test="position() != last()">
                    <span class="separator">&gt;</span>
                </xsl:if>-->
            </xsl:for-each>
        </ul>
    </xsl:template>
    
    <xsl:template name="pageContents">
        
        <xsl:param name="memberNode" select="."/>
        
        <h5>
            <!-- gotta be a nicer way to change context... -->
            <xsl:for-each select="$memberNode">
                <xsl:call-template name="memberClassesInitCaps"/>
            </xsl:for-each>
        </h5>
        
        <h2>
            
            <!-- name and immediate parent -->
            
            <xsl:call-template name="memberNameWithParent">
                <xsl:with-param name="member" select="$memberNode"/>
            </xsl:call-template>
            
            <!-- arguments -->
            
            <xsl:if test="local-name($memberNode) = 'method' or local-name($memberNode) = 'event'">
                <xsl:call-template name="argumentsList"/>
            </xsl:if>
            
            <!-- base or type -->
            <xsl:for-each select="hx:base|hx:types">
                <span>
                    <xsl:attribute name="class">
                        <xsl:value-of select="concat(local-name(), ' ', local-name(*))"/>
                        <xsl:if test="hx:link">
                            <xsl:value-of select="concat(' ', local-name(hx:link/*))"/>
                        </xsl:if>
                    </xsl:attribute>
                    <xsl:call-template name="link"/>
                    <xsl:value-of select="hx:type"/>
                </span>
            </xsl:for-each>
            
            
        </h2>
        
        <!-- summary and details -->
        
        <xsl:call-template name="summaryAndDetails"/>
        
        <!-- alias link -->
        
        <xsl:for-each select="hx:link">
            <div class="alias {local-name(*)}">
                This method is an alias of
                <xsl:call-template name="link">
                    <xsl:with-param name="includeParent" select="true()"/>
                </xsl:call-template>.
            </div>
        </xsl:for-each>
        
        <!-- constructor -->
        
        <xsl:call-template name="constructor"/>
        
        <!-- arguments -->
        
        <xsl:call-template name="argumentsAndExceptions"/>
        
        <!-- return value -->
        
        <xsl:call-template name="returnValue"/>
        
        <!-- other members -->
        
        <xsl:call-template name="memberTables" />
        
        <!-- remarks and example -->
        
        <xsl:apply-templates select="hx:remarks|hx:example"/>
        
    </xsl:template>
    
    <xsl:template name="summaryAndDetails">
        <xsl:variable name="link" select="hx:link"/>
        <xsl:for-each select="(.|//*[@id = $link/hx:internal]/hx:overload[1])/hx:summary">
            <div class="summary">
                <xsl:value-of select="."/>
            </div>
        </xsl:for-each>
        <xsl:for-each select="hx:details">
            <div class="details">
                <xsl:call-template name="markUp"/>
            </div>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="argumentsAndExceptions">
        <xsl:call-template name="argumentsTable"/>
        <xsl:call-template name="exceptionsTable"/>
    </xsl:template>
    
    <xsl:template name="argumentsTable">
        <xsl:variable name="isEvent" select="local-name() = 'event'" />
        <xsl:for-each select="hx:arguments">
            <xsl:variable name="args" select="hx:argument" />
            <div>
                <xsl:attribute name="class">
                    <xsl:text>arguments </xsl:text>
                    <xsl:choose>
                        <xsl:when test="count($args) = 1">single</xsl:when>
                        <xsl:otherwise>multiple</xsl:otherwise>
                    </xsl:choose>
                </xsl:attribute>
                <h3>Arguments</h3>
                <table cellspacing="0">
                    
                    <thead>
                        <tr>
                            <th scope="col">Name</th>
                            <th scope="col">
                                <xsl:choose>
                                    <xsl:when test="count($args/hx:types[count(*) != 1]) = 0">Type</xsl:when>
                                    <xsl:when test="count($args/hx:types[count(*) = 1]) = 0">Types</xsl:when>
                                    <xsl:otherwise>Type(s)</xsl:otherwise>
                                </xsl:choose>
                            </th>
                            <xsl:if test="not($isEvent)">
                                <th scope="col">Required</th>    
                            </xsl:if>
                            <th scope="col">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <xsl:for-each select="$args">
                            <xsl:variable name="required">
                                <xsl:choose>
                                    <xsl:when test="hx:optional">Optional</xsl:when>
                                    <xsl:otherwise>Required</xsl:otherwise>
                                </xsl:choose>
                            </xsl:variable>
                            <tr>
                                <xsl:attribute name="class" >
                                    <xsl:value-of select="translate($required, $uppercase, $lowercase)"/>
                                </xsl:attribute>
                                <th scope="row">
                                    <xsl:value-of select="hx:name"/>
                                </th>
                                <td class="types">
                                    <ul>
                                    <!-- need to go a little richer (typesets should link when possible) -->
                                    <xsl:call-template name="typeList">
                                        <xsl:with-param name="typeSet" select="hx:types"/>
                                    </xsl:call-template>
                                    </ul>
                                </td>
                                <xsl:if test="not($isEvent)">
                                    <td class="required">
                                        <xsl:value-of select="$required"/>
                                    </td>
                                </xsl:if>
                                <td class="summary">
                                    <xsl:call-template name="summaryAndDetails"/>
                                </td>
                            </tr>
                        </xsl:for-each>
                    </tbody>
                </table>
            </div>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="exceptionsTable">
        <xsl:for-each select="hx:exceptions">
            <xsl:variable name="exceptions" select="hx:exception" />
            <div>
                <xsl:attribute name="class">
                    <xsl:text>exceptions </xsl:text>
                    <xsl:choose>
                        <xsl:when test="count($exceptions) = 1">single</xsl:when>
                        <xsl:otherwise>multiple</xsl:otherwise>
                    </xsl:choose>
                </xsl:attribute>
                <h3>Throws</h3>
                <table cellspacing="0">
                    <thead>
                        <tr>
                            <th scope="col">Type</th>
                            <th scope="col">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <xsl:for-each select="$exceptions">
                            <tr class="{local-name(*)}">
                                <th>
                                    <xsl:for-each select="hx:link">
                                        <xsl:call-template name="link">
                                            <xsl:with-param name="includeParent" select="true()"/>
                                        </xsl:call-template>    
                                    </xsl:for-each>
                                    <xsl:value-of select="hx:type"/>
                                </th>
                                <td>
                                    <xsl:call-template name="summaryAndDetails"/>
                                </td>
                            </tr>
                        </xsl:for-each>
                    </tbody>
                </table>
            </div>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="returnValue">
        <xsl:if test="local-name() = 'overload'">
            <xsl:variable name="nothing" select="count(hx:returns) = 0" />
            <div class="returns">
                <xsl:attribute name="class">
                    <xsl:text>returns</xsl:text>
                    <xsl:if test="$nothing"> nothing</xsl:if>
                </xsl:attribute>
                <h3>Return Value</h3>
                <xsl:if test="$nothing">
                    <p>This <xsl:call-template name="methodOrOverload"/> does not return any value.</p>
                </xsl:if>
                <xsl:for-each select="hx:returns">
                    <ul class="types">
                        <xsl:call-template name="typeList">
                            <xsl:with-param name="typeSet" select="hx:types"/>
                        </xsl:call-template>
                    </ul>
                    <xsl:call-template name="summaryAndDetails"/>            
                </xsl:for-each>
            </div>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="hx:remarks|hx:example">
        <div>
            <xsl:attribute name="class">
                <xsl:value-of select="local-name()"/>
            </xsl:attribute>
            <h3>
                <xsl:call-template name="initialCaps">
                    <xsl:with-param name="value" select="local-name()"/>
                </xsl:call-template>
            </h3>
            <xsl:call-template name="markUp"/>
        </div>
    </xsl:template>
    
    
    
    
    
    
    
    
    <!-- member tables -->
    
    <xsl:template name="memberTables">
        
        <xsl:variable name="baseIds">
            <xsl:call-template name="baseIds"/>
            <xsl:text>#</xsl:text>
        </xsl:variable>
        
        <xsl:variable name="pageMember" select="."/>
        <xsl:variable name="bases" select="//*[contains($baseIds, concat('#', @id, '#'))]"/>
        <xsl:variable name="memberTypes" select="'!constants!variables!methods!events!classes!namespaces!'"/>
        <xsl:variable name="x" select=".|*|$bases|$bases/*"/>
        <xsl:variable name="groups" select=".|$x/hx:instance|$x/hx:static"/>
        <xsl:variable name="sets" select="$x/*[contains($memberTypes, concat('!', local-name(), '!'))]"/>
        
        <xsl:for-each select="$groups">
            <xsl:sort select="local-name()" order="descending"/>
            <xsl:variable name="groupName" select="local-name()"/>
            <xsl:if test="count(.|$groups[local-name() = $groupName][1]) = 1">
                <xsl:variable name="groupSets" select="$sets[local-name(parent::node()) = $groupName]"/>
                <xsl:if test="count($groupSets/*)">
                    <div>
                        <xsl:attribute name="class">
                            <xsl:if test="local-name() = 'static' or local-name() = 'instance'">
                                <xsl:value-of select="concat(local-name(), ' ')"/>
                            </xsl:if>
                            <xsl:text>members</xsl:text>
                        </xsl:attribute>
                        <xsl:call-template name="memberTablesRecursive">
                            <xsl:with-param name="sets" select="$groupSets"/>
                            <xsl:with-param name="memberTypes" select="substring($memberTypes, 2)"/>
                            <xsl:with-param name="baseIds" select="$baseIds"/>
                            <xsl:with-param name="bases" select="$bases"/>
                            <xsl:with-param name="pageMember" select="$pageMember"/>
                        </xsl:call-template>
                    </div>
                </xsl:if>
            </xsl:if>
        </xsl:for-each>
        
    </xsl:template>
    
    <xsl:template name="isRelevantOverride">
        <xsl:param name="member" select="."/>
        <xsl:param name="members"/>
        <xsl:param name="baseIds"/>
        <xsl:param name="pageMember"/>
        <xsl:param name="bases"/>
        
        <xsl:variable name="parent" select="ancestor::node()[local-name() = local-name($pageMember)][1]"/>
        <xsl:variable name="ancestors" select="concat(substring-before($baseIds, concat('#', $parent/@id, '#')), '#')"/>
        <xsl:variable name="overridingMembers" select="$members[
            hx:name = $member/hx:name 
                and
            ancestor::node()[local-name() = local-name($pageMember)][1]
            = ($bases[contains($ancestors, concat('#', @id, '#'))]|$pageMember)
            ]"
        />
        <xsl:variable name="return" select="
            count($overridingMembers) = 0 
            or 
            count($parent|$pageMember) = 1"/>
        
        <xsl:value-of select="$return"/>
        
    </xsl:template>
    
    <xsl:template name="hasAccess">
        <xsl:param name="members"/>
        <xsl:param name="baseIds"/>
        <xsl:param name="pageMember"/>
        <xsl:param name="bases"/>
        <xsl:for-each select="$members">
            <xsl:variable name="isRelevant">
                <xsl:call-template name="isRelevantOverride">
                    <xsl:with-param name="members" select="$members"/>
                    <xsl:with-param name="baseIds" select="$baseIds"/>
                    <xsl:with-param name="pageMember" select="$pageMember"/>
                    <xsl:with-param name="bases" select="$bases"/>
                </xsl:call-template>
            </xsl:variable>
            <xsl:if test="$isRelevant = 'true'">
                <xsl:value-of select="hx:access"/>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="hasInherited">
        <xsl:param name="members"/>
        <xsl:param name="baseIds"/>
        <xsl:param name="pageMember"/>
        <xsl:param name="bases"/>
        <xsl:for-each select="$members">
            <xsl:variable name="isRelevant">
                <xsl:call-template name="isRelevantOverride">
                    <xsl:with-param name="members" select="$members"/>
                    <xsl:with-param name="baseIds" select="$baseIds"/>
                    <xsl:with-param name="pageMember" select="$pageMember"/>
                    <xsl:with-param name="bases" select="$bases"/>
                </xsl:call-template>
            </xsl:variable>
            
            <xsl:if test="$isRelevant = 'true' and count(ancestor::node()[local-name() = local-name($pageMember)][1]|$pageMember) = 2">
                <xsl:text>1</xsl:text>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="memberTablesRecursive">
        <xsl:param name="memberTypes"/>
        <xsl:param name="sets"/>
        <xsl:param name="baseIds"/>
        <xsl:param name="pageMember"/>
        <xsl:param name="bases"/>
        <xsl:if test="$memberTypes">
            
            <xsl:variable name="set" select="substring-before($memberTypes, '!')"/>
            <xsl:variable name="group" select="local-name()"/>
            <xsl:variable name="members" select="$sets[local-name() = $set]/*"/>
            
            <xsl:if test="$members">
                
                <xsl:variable name="hasAccess_">
                    <xsl:call-template name="hasAccess">
                        <xsl:with-param name="members" select="$members"/>
                        <xsl:with-param name="baseIds" select="$baseIds"/>
                        <xsl:with-param name="pageMember" select="$pageMember"/>
                        <xsl:with-param name="bases" select="$bases"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:variable name="hasAccess" select="$hasAccess_ != ''"/>
                <xsl:variable name="hasInherited_">
                    <xsl:call-template name="hasInherited">
                        <xsl:with-param name="members" select="$members"/>
                        <xsl:with-param name="baseIds" select="$baseIds"/>
                        <xsl:with-param name="pageMember" select="$pageMember"/>
                        <xsl:with-param name="bases" select="$bases"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:variable name="hasInherited" select="$hasInherited_ != ''"/>
                <xsl:variable name="hasBases" select="count($members/hx:base) != 0"/>

                <div class="memberSet {$set}">
                    
                    <h3>
                        <xsl:call-template name="initialCaps">
                            <xsl:with-param name="value" select="$set"/>
                        </xsl:call-template>
                    </h3>
                    
                    <table cellspacing="0">
                        <thead>
                            <tr>
                                <xsl:if test="$hasAccess">
                                    <th scope="col">Access</th>
                                </xsl:if>
                                <th scope="col">Name</th>
                                <xsl:if test="$hasBases">
                                    <th scope="col">Base</th>
                                </xsl:if>
                                <xsl:if test="$hasInherited">
                                    <th scope="col">Inherited From</th>                                    
                                </xsl:if>
                                <th scope="col">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="$members">
                                <xsl:sort select="hx:name"/>
                                <xsl:variable name="isRelevant">
                                    <xsl:call-template name="isRelevantOverride">
                                        <xsl:with-param name="members" select="$members"/>
                                        <xsl:with-param name="baseIds" select="$baseIds"/>
                                        <xsl:with-param name="pageMember" select="$pageMember"/>
                                        <xsl:with-param name="bases" select="$bases"/>
                                    </xsl:call-template>
                                </xsl:variable>
                                <xsl:if test="$isRelevant = 'true'">
                                    <xsl:variable name="name" select="hx:name"/>
                                    <xsl:call-template name="memberTableRow">
                                        <xsl:with-param name="hasAccessLevels" select="$hasAccess"/>
                                        <xsl:with-param name="hasInherited" select="$hasInherited"/>
                                        <xsl:with-param name="isInherited" select="count(ancestor::node()[local-name() = local-name($pageMember)][1]|$pageMember) = 2"/>
                                        <xsl:with-param name="isOverride" select="count($members[hx:name = $name]) != 1"/>
                                        <xsl:with-param name="hasBases" select="$hasBases"/>
                                    </xsl:call-template>
                                </xsl:if>
                            </xsl:for-each>
                        </tbody>
                    </table>
                    
                </div>
            </xsl:if>
            
            <xsl:call-template name="memberTablesRecursive">
                <xsl:with-param name="memberTypes" select="substring-after($memberTypes, '!')"/>
                <xsl:with-param name="sets" select="$sets"/>
                <xsl:with-param name="baseIds" select="$baseIds"/>
                <xsl:with-param name="pageMember" select="$pageMember"/>
                <xsl:with-param name="bases" select="$bases"/>
            </xsl:call-template>
            
        </xsl:if>
    </xsl:template>
    
    <xsl:template name="memberTableRow">
        <xsl:param name="hasAccessLevels" select="false()"/>
        <xsl:param name="hasInherited" select="false()"/>
        <xsl:param name="hasBases" select="false()"/>
        <xsl:param name="isInherited" select="false()"/>
        <xsl:param name="isOverride" select="false()"/>
        <xsl:for-each select="hx:overload|self::node()[not(hx:overload)]">
            <xsl:variable name="memberNode" select="(.|..)[hx:name]"/>
            <tr>
                <xsl:variable name="class">
                    <xsl:if test="hx:link"> alias</xsl:if>
                    <xsl:if test="$isInherited"> inherited</xsl:if>
                    <xsl:if test="$isOverride"> override</xsl:if>
                </xsl:variable>
                <xsl:if test="string-length($class) != 0">
                    <xsl:attribute name="class">
                        <xsl:value-of select="substring($class, 2)"/>
                    </xsl:attribute>    
                </xsl:if>
                
                <!-- access level -->
                
                <xsl:if test="$hasAccessLevels">
                    <td>
                        <xsl:attribute name="class">
                            <xsl:text>access </xsl:text>
                            <xsl:choose>
                                <xsl:when test="$memberNode/hx:access">
                                    <xsl:value-of select="$memberNode/hx:access"/>
                                </xsl:when>
                                <xsl:otherwise>blank</xsl:otherwise>
                            </xsl:choose>
                        </xsl:attribute>
                        <xsl:call-template name="initialCaps">
                            <xsl:with-param name="value" select="$memberNode/hx:access"/>
                        </xsl:call-template>
                    </td>
                </xsl:if>
                
                <!-- name -->
                
                <th scope="row">
                    <a>
                        <xsl:call-template name="memberHref"/>
                        <xsl:value-of select="$memberNode/hx:name"/>
                        <xsl:if test="local-name($memberNode) = 'method' or local-name($memberNode) = 'event'">
                            <xsl:call-template name="argumentsList">
                                <xsl:with-param name="noLinks" select="true()"/>
                            </xsl:call-template>
                        </xsl:if>
                        
                    </a>
                </th>
                
                <!-- base (classes) -->
                
                <xsl:if test="$hasBases">
                    <td>
                        <xsl:attribute name="class">
                            <xsl:text>base</xsl:text>
                            <xsl:if test="not(hx:base)"> blank</xsl:if>
                            <xsl:for-each select="hx:base//*">
                                <xsl:value-of select="concat(' ', local-name())"/>
                            </xsl:for-each>
                        </xsl:attribute>
                        <xsl:for-each select="hx:base/hx:link">
                            <xsl:call-template name="link"/>    
                        </xsl:for-each>
                        <xsl:value-of select="hx:base/hx:type"/>
                    </td>
                </xsl:if>
                
                <!-- inherited from (args) -->
                
                <xsl:if test="$hasInherited">
                    <td>
                        <xsl:attribute name="class">
                            <xsl:text>inheritedFrom</xsl:text>
                            <xsl:if test="not($isInherited)"> blank</xsl:if>
                        </xsl:attribute>
                        <xsl:if test="$isInherited">
                            <a>
                                <xsl:for-each select="$memberNode/ancestor::*[hx:name][1]">
                                    <xsl:call-template name="memberHref"/>
                                    <xsl:value-of select="hx:name"/>
                                </xsl:for-each>
                            </a>
                        </xsl:if>
                    </td>
                </xsl:if>
                
                <!-- description -->
                
                <td class="description">
                    <xsl:for-each select="hx:link">
                        <xsl:text>See </xsl:text>
                        <xsl:call-template name="link">
                            <xsl:with-param name="includeParent" select="true()"/>
                        </xsl:call-template>
                    </xsl:for-each>
                    <xsl:value-of select="hx:summary"/>                    
                </td>
                
            </tr>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="constructor">
        <xsl:param name="originalClass" select="."/>
        <xsl:choose>
            <xsl:when test="hx:constructor">
                <div class="constructor">
                    <h3>Constructor</h3>
                    <xsl:for-each select="hx:constructor/hx:overload">
                        <div class="overload">
                            
                            <h4>
                                <span class="name">
                                    <xsl:call-template name="memberNameWithParent">
                                        <xsl:with-param name="member" select="$originalClass"/>
                                    </xsl:call-template>
                                </span>
                                <xsl:call-template name="argumentsList"/>
                            </h4>
                            
                            <xsl:call-template name="summaryAndDetails"/>
                            
                            <xsl:call-template name="argumentsAndExceptions"/>
                            
                            <xsl:apply-templates select="hx:remarks|hx:example"/>
                            
                        </div>
                    </xsl:for-each>
                    
                    
                    
                </div>
            </xsl:when>
            <xsl:when test="hx:base">
                <xsl:variable name="id" select="hx:base//hx:internal"/>
                <xsl:for-each select="//*[@id = $id]">
                    <xsl:call-template name="constructor">
                        <xsl:with-param name="originalClass" select="$originalClass"/>
                    </xsl:call-template>
                </xsl:for-each>
            </xsl:when>
        </xsl:choose>
        
    </xsl:template>
    
    
</xsl:stylesheet>






















